import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, userId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institution_id");

    // Para maestros, solo salones asignados. Para admin/tutor RLS limita. Para master, filtrar por institution_id si se envía.
    let classroomIds: string[] | null = null;
    if (profile.role === "maestro") {
      const { data: ctRows, error: ctError } = await supabase
        .from("classroom_teachers")
        .select("classroom_id")
        .eq("teacher_profile_id", profile.id);

      if (ctError) {
        return NextResponse.json(
          { error: "DB error", message: ctError.message },
          { status: 500 },
        );
      }

      classroomIds = (ctRows ?? []).map((r: any) => r.classroom_id).filter(Boolean);

      // Si el maestro no tiene salones asignados, devolver lista vacía.
      if (!classroomIds.length) {
        return NextResponse.json({ classrooms: [] }, { status: 200 });
      }
    }

    let query = supabase
      .from("classrooms")
      .select("id,name,grade_id")
      .is("deleted_at", null)
      .order("grade_id", { ascending: true })
      .order("name", { ascending: true });

    if (profile.role === "master" && institutionIdParam) {
      query = query.eq("institution_id", institutionIdParam);
    }
    const finalQuery = classroomIds ? query.in("id", classroomIds) : query;
    const { data, error } = await finalQuery;

    if (error) {
      return NextResponse.json({ error: "DB error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ classrooms: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
