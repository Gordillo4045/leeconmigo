import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET() {
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

    // Solo maestro debe llegar aquí; otros roles no usan este endpoint hoy.
    if (profile.role !== "maestro") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 1) Obtener los grados de los salones donde el maestro está asignado
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

    const allowedGrades = Array.from(
      new Set(
        (ctRows ?? [])
          .map((row: any) => row.classrooms?.grade_id)
          .filter((g: any) => typeof g === "number"),
      ),
    ) as number[];

    // Si el maestro no tiene grados asociados vía salones, no mostrar ninguna plantilla.
    if (!allowedGrades.length) {
      return NextResponse.json({ ok: true, templates: [] }, { status: 200 });
    }

    // 2) Listado de textos SOLO para los grados donde el maestro tiene salón
    const { data, error } = await supabase
      .from("texts")
      .select(
        `
        id,
        title,
        topic,
        difficulty,
        grade_id,
        created_at,
        quizzes (
          id,
          question_count
        )
      `,
      )
      .in("grade_id", allowedGrades)
      .order("created_at", { ascending: false });

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

    return NextResponse.json({ ok: true, templates: result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
