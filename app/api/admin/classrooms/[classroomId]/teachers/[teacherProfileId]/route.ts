import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Quita un profesor del salón. Solo admin o master de la institución. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ classroomId: string; teacherProfileId: string }> }
) {
  try {
    const { classroomId, teacherProfileId } = await params;
    if (!classroomId || !teacherProfileId) {
      return NextResponse.json({ error: "Faltan classroom_id o teacher_profile_id" }, { status: 400 });
    }

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

    const { error: deleteError } = await admin
      .from("classroom_teachers")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("teacher_profile_id", teacherProfileId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Error al quitar profesor", message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
