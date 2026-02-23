import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = user.id;
    const admin = createAdminClient();

    // Verify teacher role
    const { data: teacherProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", teacherId)
      .single();

    if (!teacherProfile || teacherProfile.role !== "maestro") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the assignment to validate ownership
    const { data: assignment, error: assignErr } = await admin
      .from("student_tutors")
      .select("id, student_id, deleted_at")
      .eq("id", assignmentId)
      .maybeSingle();

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 500 });
    }
    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }
    if (assignment.deleted_at) {
      return NextResponse.json({ error: "La asignación ya fue eliminada" }, { status: 409 });
    }

    // Validate: student belongs to one of teacher's classrooms
    const { data: classroomTeachers } = await admin
      .from("classroom_teachers")
      .select("classroom_id")
      .eq("teacher_profile_id", teacherId);

    const classroomIds = (classroomTeachers ?? []).map((ct) => ct.classroom_id).filter(Boolean);

    if (classroomIds.length === 0) {
      return NextResponse.json({ error: "No tienes salones asignados" }, { status: 403 });
    }

    const { data: enrollment } = await admin
      .from("student_enrollments")
      .select("student_id")
      .in("classroom_id", classroomIds)
      .eq("student_id", assignment.student_id)
      .eq("active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar este alumno" },
        { status: 403 },
      );
    }

    // Soft delete
    const { error: deleteErr } = await admin
      .from("student_tutors")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
