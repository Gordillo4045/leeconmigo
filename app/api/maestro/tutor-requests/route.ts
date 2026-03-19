import { NextResponse } from "next/server";
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

    const admin = createAdminClient();

    // 1. Get teacher profile with role + institution_id
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, institution_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Get classroom IDs
    let classroomIds: string[];

    if (profile.role === "master") {
      const { data: allRooms, error: roomsErr } = await admin
        .from("classrooms")
        .select("id")
        .is("deleted_at", null);

      if (roomsErr) {
        return NextResponse.json({ error: roomsErr.message }, { status: 500 });
      }

      classroomIds = ((allRooms ?? []) as { id: string }[])
        .map((c) => c.id)
        .filter(Boolean);
    } else {
      const { data: classroomLinks, error: ctErr } = await admin
        .from("classroom_teachers")
        .select("classroom_id")
        .eq("teacher_profile_id", profile.id);

      if (ctErr) {
        return NextResponse.json({ error: ctErr.message }, { status: 500 });
      }

      classroomIds = (classroomLinks ?? [])
        .map((c) => c.classroom_id)
        .filter(Boolean);
    }

    // 3. Get active enrolled student IDs
    if (classroomIds.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    const { data: enrollments, error: enrollErr } = await admin
      .from("student_enrollments")
      .select("student_id")
      .in("classroom_id", classroomIds)
      .eq("active", true)
      .is("deleted_at", null);

    if (enrollErr) {
      return NextResponse.json({ error: enrollErr.message }, { status: 500 });
    }

    const studentIds = [
      ...new Set(
        (enrollments ?? []).map((e) => e.student_id).filter(Boolean),
      ),
    ];

    // 4. No students: return empty
    if (studentIds.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    // 5. Fetch pending requests
    const { data: requests, error: reqErr } = await admin
      .from("tutor_student_requests")
      .select("id, tutor_profile_id, student_id, student_curp, created_at")
      .in("student_id", studentIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    // 6. Fetch tutor profile info for all unique tutor IDs
    const tutorIds = [...new Set(requests.map((r) => r.tutor_profile_id).filter(Boolean))];

    let tutorMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (tutorIds.length > 0) {
      const { data: tutorProfiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", tutorIds);

      for (const tp of tutorProfiles ?? []) {
        tutorMap[tp.id] = { full_name: tp.full_name, email: tp.email };
      }
    }

    // 7. Fetch student names for all unique student IDs
    const reqStudentIds = [...new Set(requests.map((r) => r.student_id).filter(Boolean))];

    let studentMap: Record<string, string> = {};
    if (reqStudentIds.length > 0) {
      const { data: studentRows } = await admin
        .from("students")
        .select("id, first_name, last_name")
        .in("id", reqStudentIds)
        .is("deleted_at", null);

      for (const s of studentRows ?? []) {
        studentMap[s.id] =
          `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Sin nombre";
      }
    }

    // 8. Shape response — do NOT include student_curp
    const shaped = requests.map((r) => {
      const tutor = tutorMap[r.tutor_profile_id];
      return {
        id: r.id,
        tutorProfileId: r.tutor_profile_id,
        tutorName: tutor?.full_name ?? "Sin nombre",
        tutorEmail: tutor?.email ?? "",
        studentId: r.student_id,
        studentName: studentMap[r.student_id] ?? "Sin nombre",
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ requests: shaped });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
