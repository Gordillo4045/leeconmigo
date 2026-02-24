import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

type Classroom = { id: string; name: string; grade_id: number };

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!profile.institution_id) {
      return NextResponse.json({ error: "Falta institution_id en el profile" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1) classroom_ids asignados al maestro (SIN deleted_at porque tu tabla no lo tiene)
    const { data: ctRows, error: ctErr } = await admin
      .from("classroom_teachers")
      .select("classroom_id")
      .eq("teacher_profile_id", profile.id);

    if (ctErr) {
      return NextResponse.json(
        { error: "Error al cargar asignaciones", message: ctErr.message },
        { status: 500 }
      );
    }

    const classroomIds = (ctRows ?? [])
      .map((r: any) => r.classroom_id as string)
      .filter(Boolean);

    if (classroomIds.length === 0) {
      return NextResponse.json({ classrooms: [] }, { status: 200 });
    }

    // 2) Salones por IDs (classrooms sí puede tener deleted_at, lo dejamos)
    const { data: rooms, error: roomsErr } = await admin
      .from("classrooms")
      .select("id, name, grade_id, institution_id")
      .in("id", classroomIds)
      .eq("institution_id", profile.institution_id)
      .is("deleted_at", null);

    if (roomsErr) {
      return NextResponse.json(
        { error: "Error al listar salones", message: roomsErr.message },
        { status: 500 }
      );
    }

    const classrooms: Classroom[] =
      (rooms ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        grade_id: c.grade_id,
      })) ?? [];

    classrooms.sort(
      (a, b) =>
        a.grade_id - b.grade_id || String(a.name).localeCompare(String(b.name))
    );

    return NextResponse.json({ classrooms }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
