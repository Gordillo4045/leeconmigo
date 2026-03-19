import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "tutor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const student_id =
      body && typeof body === "object" && "student_id" in body
        ? (body as Record<string, unknown>).student_id
        : undefined;

    if (!student_id || typeof student_id !== "string" || !student_id.trim()) {
      return NextResponse.json(
        { error: "student_id es requerido" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // 1. Fetch student
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("id, first_name, last_name, curp, institution_id")
      .eq("id", student_id)
      .is("deleted_at", null)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    }

    // 2. Check not already assigned
    const { data: existingAssignment } = await admin
      .from("student_tutors")
      .select("id")
      .eq("student_id", student.id)
      .eq("tutor_profile_id", profile.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Ya eres tutor de este alumno" },
        { status: 409 },
      );
    }

    // 3. Check no pending request
    const { data: pendingRequest } = await admin
      .from("tutor_student_requests")
      .select("id")
      .eq("student_id", student.id)
      .eq("tutor_profile_id", profile.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRequest) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente para este alumno" },
        { status: 409 },
      );
    }

    // 4. Insert the request
    const { data: newRequest, error: insertErr } = await admin
      .from("tutor_student_requests")
      .insert({
        tutor_profile_id: profile.id,
        student_id: student.id,
        student_curp: student.curp,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !newRequest) {
      return NextResponse.json(
        { error: "No se pudo crear la solicitud", message: insertErr?.message },
        { status: 500 },
      );
    }

    // 5. Find teachers of the student's active classrooms and notify them (fire-and-forget)
    try {
      const { data: enrollments } = await admin
        .from("student_enrollments")
        .select("classroom_id")
        .eq("student_id", student.id)
        .eq("active", true)
        .is("deleted_at", null);

      const classroomIds = (enrollments ?? []).map((e) => e.classroom_id);

      if (classroomIds.length > 0) {
        const { data: classroomTeachers } = await admin
          .from("classroom_teachers")
          .select("teacher_profile_id")
          .in("classroom_id", classroomIds);

        if (classroomTeachers && classroomTeachers.length > 0) {
          const studentName =
            `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Un alumno";
          const tutorName = profile.full_name ?? "Un tutor";

          await admin.from("notifications").insert(
            classroomTeachers.map((ct) => ({
              institution_id: student.institution_id,
              recipient_profile_id: ct.teacher_profile_id,
              title: "Nueva solicitud de tutor",
              body: `${tutorName} solicita ser tutor de ${studentName}. Revisa la sección Tutores.`,
              is_read: false,
            })),
          );
        }
      }
    } catch {
      // Notifications are non-fatal; do not fail the request
    }

    return NextResponse.json({ ok: true, requestId: newRequest.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
