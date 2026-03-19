import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify role
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, institution_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch the request
    const { data: request, error: fetchErr } = await admin
      .from("tutor_student_requests")
      .select("id, tutor_profile_id, student_id, status")
      .eq("id", requestId)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // 2. Check status
    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "La solicitud ya fue procesada" },
        { status: 409 },
      );
    }

    // 3. Verify student belongs to maestro's classrooms (master skips this)
    if (profile.role !== "master") {
      const { data: classroomLinks } = await admin
        .from("classroom_teachers")
        .select("classroom_id")
        .eq("teacher_profile_id", profile.id);

      const classroomIds = (classroomLinks ?? [])
        .map((c) => c.classroom_id)
        .filter(Boolean);

      if (classroomIds.length === 0) {
        return NextResponse.json({ error: "No tienes salones asignados" }, { status: 403 });
      }

      const { data: enrollment } = await admin
        .from("student_enrollments")
        .select("student_id")
        .in("classroom_id", classroomIds)
        .eq("student_id", request.student_id)
        .eq("active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json(
          { error: "El alumno no pertenece a tus salones" },
          { status: 403 },
        );
      }
    }

    // 4. Check for existing student_tutors row (active or soft-deleted)
    const { data: existingAssignment } = await admin
      .from("student_tutors")
      .select("id, deleted_at")
      .eq("student_id", request.student_id)
      .eq("tutor_profile_id", request.tutor_profile_id)
      .maybeSingle();

    if (existingAssignment && !existingAssignment.deleted_at) {
      return NextResponse.json(
        { error: "El tutor ya está asignado a este alumno" },
        { status: 409 },
      );
    }

    // 5. Insert or restore soft-deleted student_tutors row
    let insertErr: { message: string } | null = null;

    if (existingAssignment?.deleted_at) {
      const { error } = await admin
        .from("student_tutors")
        .update({ deleted_at: null, assigned_by: profile.id })
        .eq("id", existingAssignment.id);
      insertErr = error;
    } else {
      const { error } = await admin.from("student_tutors").insert({
        student_id: request.student_id,
        tutor_profile_id: request.tutor_profile_id,
        assigned_by: profile.id,
      });
      insertErr = error;
    }

    if (insertErr) {
      const msg = insertErr.message ?? "";
      if (msg.toLowerCase().includes("max") || msg.toLowerCase().includes("trigger")) {
        return NextResponse.json(
          { error: "El alumno ya tiene el máximo de tutores permitidos" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // 6. Update request status
    await admin
      .from("tutor_student_requests")
      .update({
        status: "approved",
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    // 7. Fetch student name for notification
    const { data: studentRow } = await admin
      .from("students")
      .select("first_name, last_name")
      .eq("id", request.student_id)
      .single();

    const studentName =
      `${studentRow?.first_name ?? ""} ${studentRow?.last_name ?? ""}`.trim() ||
      "el alumno";

    // 8. Fetch institution_id from student
    const { data: studentFull } = await admin
      .from("students")
      .select("institution_id")
      .eq("id", request.student_id)
      .single();

    // 9. Insert notification for tutor (non-fatal)
    try {
      await admin.from("notifications").insert({
        institution_id: studentFull?.institution_id,
        recipient_profile_id: request.tutor_profile_id,
        title: "Solicitud aprobada",
        body: `Tu solicitud para ser tutor de ${studentName} fue aprobada.`,
        is_read: false,
        created_by: profile.id,
      });
    } catch {
      // Notification failure is non-fatal
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
