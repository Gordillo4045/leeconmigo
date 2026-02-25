import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
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

    // 1. Verify teacher role
    const { data: teacherProfile } = await admin
      .from("profiles")
      .select("role, institution_id")
      .eq("id", teacherId)
      .single();

    if (!teacherProfile || (teacherProfile.role !== "maestro" && teacherProfile.role !== "master")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let classroomIds: string[];

    if (teacherProfile.role === "master") {
      // Master: todos los salones del sistema
      const { data: allRooms, error: roomsErr } = await admin
        .from("classrooms")
        .select("id")
        .is("deleted_at", null);

      if (roomsErr) {
        return NextResponse.json({ error: roomsErr.message }, { status: 500 });
      }

      classroomIds = ((allRooms ?? []) as any[]).map((c) => c.id as string).filter(Boolean);
    } else {
      // 2. Get teacher's classrooms
      const { data: classroomTeachers, error: ctErr } = await admin
        .from("classroom_teachers")
        .select("classroom_id")
        .eq("teacher_profile_id", teacherId);

      if (ctErr) {
        return NextResponse.json({ error: ctErr.message }, { status: 500 });
      }

      classroomIds = (classroomTeachers ?? []).map((ct) => ct.classroom_id).filter(Boolean);
    }

    if (classroomIds.length === 0) {
      return NextResponse.json({ students: [], availableTutors: [] });
    }

    // 3. Get enrolled students with name + grade
    const { data: enrollments, error: enrollErr } = await admin
      .from("student_enrollments")
      .select("student_id, grade_id")
      .in("classroom_id", classroomIds)
      .eq("active", true)
      .is("deleted_at", null);

    if (enrollErr) {
      return NextResponse.json({ error: enrollErr.message }, { status: 500 });
    }

    const studentIds = Array.from(
      new Set((enrollments ?? []).map((e) => e.student_id).filter(Boolean)),
    );

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [], availableTutors: [] });
    }

    const { data: studentRows, error: studentsErr } = await admin
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds)
      .is("deleted_at", null);

    if (studentsErr) {
      return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    }

    // 4. Get tutor assignments for these students
    const { data: assignments, error: assignErr } = await admin
      .from("student_tutors")
      .select("id, student_id, tutor_profile_id")
      .in("student_id", studentIds)
      .is("deleted_at", null);

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 500 });
    }

    // 5. Get tutor profile details for assigned tutors
    const assignedTutorIds = Array.from(
      new Set((assignments ?? []).map((a) => a.tutor_profile_id).filter(Boolean)),
    );

    let tutorProfileMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (assignedTutorIds.length > 0) {
      const { data: tutorProfiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", assignedTutorIds);

      for (const tp of tutorProfiles ?? []) {
        tutorProfileMap[tp.id] = { full_name: tp.full_name, email: tp.email };
      }
    }

    // Build students payload with assignedTutors
    const enrollMap = new Map(
      (enrollments ?? []).map((e) => [e.student_id, e.grade_id]),
    );

    const assignmentsByStudent = new Map<
      string,
      { assignmentId: string; tutorProfileId: string; tutorName: string; tutorEmail: string }[]
    >();
    for (const a of assignments ?? []) {
      const tp = tutorProfileMap[a.tutor_profile_id];
      const list = assignmentsByStudent.get(a.student_id) ?? [];
      list.push({
        assignmentId: a.id,
        tutorProfileId: a.tutor_profile_id,
        tutorName: tp?.full_name ?? "Sin nombre",
        tutorEmail: tp?.email ?? "",
      });
      assignmentsByStudent.set(a.student_id, list);
    }

    const students = (studentRows ?? []).map((s) => ({
      id: s.id,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Sin nombre",
      grade: enrollMap.get(s.id) ?? null,
      assignedTutors: assignmentsByStudent.get(s.id) ?? [],
    }));

    // 6. Available tutors: master ve todos, maestro solo los de su institución
    let availableTutorsQuery = admin
      .from("profiles")
      .select("id, full_name, email, child_name, child_grade")
      .eq("role", "tutor");

    if (teacherProfile.role !== "master" && teacherProfile.institution_id) {
      availableTutorsQuery = availableTutorsQuery.eq("institution_id", teacherProfile.institution_id);
    }

    const { data: availableTutorRows, error: tutorsErr } = await availableTutorsQuery;

    if (tutorsErr) {
      return NextResponse.json({ error: tutorsErr.message }, { status: 500 });
    }

    const availableTutors = (availableTutorRows ?? []).map((t) => ({
      id: t.id,
      full_name: t.full_name ?? "Sin nombre",
      email: t.email ?? "",
      child_name: t.child_name ?? null,
      child_grade: t.child_grade ?? null,
    }));

    return NextResponse.json({ students, availableTutors });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .select("role, institution_id")
      .eq("id", teacherId)
      .single();

    if (!teacherProfile || (teacherProfile.role !== "maestro" && teacherProfile.role !== "master")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, tutor_profile_id } = body ?? {};

    if (!student_id || !tutor_profile_id) {
      return NextResponse.json({ error: "student_id y tutor_profile_id son requeridos" }, { status: 400 });
    }

    // Validate: student belongs to one of teacher's classrooms (maestro only; master puede asignar cualquier alumno)
    if (teacherProfile.role !== "master") {
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
        .eq("student_id", student_id)
        .eq("active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json({ error: "El alumno no pertenece a tus salones" }, { status: 403 });
      }
    }

    // Validate: tutor exists, has role tutor, same institution
    const { data: tutorProfile } = await admin
      .from("profiles")
      .select("id, role, institution_id")
      .eq("id", tutor_profile_id)
      .single();

    if (!tutorProfile || tutorProfile.role !== "tutor") {
      return NextResponse.json({ error: "El tutor no existe o no tiene el rol correcto" }, { status: 400 });
    }

    // Maestro: verificar misma institución. Master puede asignar tutores de cualquier institución.
    if (
      teacherProfile.role !== "master" &&
      tutorProfile.institution_id !== teacherProfile.institution_id
    ) {
      return NextResponse.json({ error: "El tutor no pertenece a la misma institución" }, { status: 400 });
    }

    // Upsert: if there's a soft-deleted record, restore it; otherwise insert
    const { data: existing } = await admin
      .from("student_tutors")
      .select("id, deleted_at")
      .eq("student_id", student_id)
      .eq("tutor_profile_id", tutor_profile_id)
      .maybeSingle();

    if (existing) {
      if (!existing.deleted_at) {
        return NextResponse.json({ error: "Este tutor ya está asignado al alumno" }, { status: 409 });
      }
      // Restore soft-deleted record
      const { error: restoreErr } = await admin
        .from("student_tutors")
        .update({ deleted_at: null, assigned_by: teacherId })
        .eq("id", existing.id);

      if (restoreErr) {
        return NextResponse.json({ error: restoreErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { error: insertErr } = await admin.from("student_tutors").insert({
      student_id,
      tutor_profile_id,
      assigned_by: teacherId,
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
