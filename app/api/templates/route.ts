import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!["maestro", "admin", "master"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let allowedGrades: number[];
    let institutionFilter: string | null = null;

    if (profile.role === "master") {
      const url = new URL(request.url);
      const instId = url.searchParams.get("institution_id");
      allowedGrades = [1, 2, 3];
      if (instId) institutionFilter = instId;
    } else if (profile.role === "admin") {
      allowedGrades = [1, 2, 3];
      institutionFilter = profile.institution_id ?? null;
    } else {
      const { data: ctRows, error: ctError } = await supabase
        .from("classroom_teachers")
        .select("classroom_id, classrooms!inner(grade_id)")
        .eq("teacher_profile_id", profile.id);

      if (ctError) {
        return NextResponse.json(
          { error: "DB error", message: ctError.message },
          { status: 500 },
        );
      }

      allowedGrades = Array.from(
        new Set(
          (ctRows ?? [])
            .map((row: any) => row.classrooms?.grade_id)
            .filter((g: any) => typeof g === "number"),
        ),
      ) as number[];

      if (!allowedGrades.length) {
        return NextResponse.json({
          ok: true,
          templates: [],
          message: "No tienes salones asignados. Contacta al administrador de tu institución para que te asigne a un salón.",
          hasClassrooms: false,
        }, { status: 200 });
      }
      institutionFilter = profile.institution_id ?? null;
    }

    let query = supabase
      .from("texts")
      .select(
        `
        id,
        title,
        topic,
        difficulty,
        grade_id,
        created_at,
        institution_id,
        quizzes (
          id,
          question_count
        )
      `,
      )
      .in("grade_id", allowedGrades)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (institutionFilter) {
      query = query.eq("institution_id", institutionFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "DB error", message: error.message },
        { status: 500 }
      );
    }

    // Normaliza: quiz puede ser null si no hubo preguntas
    const result =
      data?.map((t: any) => ({
        id: t.id as string,
        title: (t.title as string) ?? "(Sin título)",
        topic: (t.topic as string) ?? "",
        difficulty: (t.difficulty as string) ?? "",
        grade_id: t.grade_id as number,
        created_at: t.created_at as string,
        quiz_id: t.quizzes?.[0]?.id ?? null,
        question_count: t.quizzes?.[0]?.question_count ?? 0,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      templates: result,
      hasClassrooms: true,
      allowedGrades,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
