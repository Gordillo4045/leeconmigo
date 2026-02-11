import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Lista los profesores asignados a un salón. Solo admin o master de la institución del salón. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    if (!classroomId) return NextResponse.json({ error: "Falta classroom_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: classroom, error: classError } = await admin
      .from("classrooms")
      .select("id, institution_id")
      .eq("id", classroomId)
      .is("deleted_at", null)
      .single();

    if (classError || !classroom) {
      return NextResponse.json({ error: "Salón no encontrado" }, { status: 404 });
    }

    if (profile.role === "admin" && profile.institution_id !== classroom.institution_id) {
      return NextResponse.json({ error: "No autorizado para este salón" }, { status: 403 });
    }

    const { data: rows, error } = await admin
      .from("classroom_teachers")
      .select("id, teacher_profile_id, profiles(full_name, email)")
      .eq("classroom_id", classroomId);

    if (error) {
      return NextResponse.json(
        { error: "Error al listar profesores", message: error.message },
        { status: 500 }
      );
    }

    const teachers = (rows ?? []).map((r: { id: string; teacher_profile_id: string; profiles?: { id: string; full_name: string | null; email: string | null } | null }) => ({
      id: r.id,
      teacher_profile_id: r.teacher_profile_id,
      full_name: r.profiles?.full_name ?? null,
      email: r.profiles?.email ?? null,
    }));

    return NextResponse.json({ teachers }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Asigna un profesor al salón. Solo admin o master. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    if (!classroomId) return NextResponse.json({ error: "Falta classroom_id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const teacherProfileId = body?.teacher_profile_id;
    if (!teacherProfileId) return NextResponse.json({ error: "Falta teacher_profile_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: classroom, error: classError } = await admin
      .from("classrooms")
      .select("id, institution_id")
      .eq("id", classroomId)
      .is("deleted_at", null)
      .single();

    if (classError || !classroom) {
      return NextResponse.json({ error: "Salón no encontrado" }, { status: 404 });
    }

    if (profile.role === "admin" && profile.institution_id !== classroom.institution_id) {
      return NextResponse.json({ error: "No autorizado para este salón" }, { status: 403 });
    }

    const { data: teacherProfile } = await admin
      .from("profiles")
      .select("id, role, institution_id")
      .eq("id", teacherProfileId)
      .is("deleted_at", null)
      .single();

    if (!teacherProfile || teacherProfile.role !== "maestro") {
      return NextResponse.json({ error: "El perfil no es un maestro o no existe" }, { status: 400 });
    }
    if (teacherProfile.institution_id !== classroom.institution_id) {
      return NextResponse.json({ error: "El maestro no pertenece a esta institución" }, { status: 400 });
    }

    const { error: insertError } = await admin.from("classroom_teachers").insert({
      classroom_id: classroomId,
      teacher_profile_id: teacherProfileId,
      created_by: profile.id,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Este profesor ya está asignado al salón" }, { status: 409 });
      }
      return NextResponse.json(
        { error: "Error al asignar profesor", message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
