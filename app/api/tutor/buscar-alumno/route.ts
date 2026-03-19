import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const curpParam = searchParams.get("curp") ?? "";

    const normalizedCurp = curpParam.trim().toUpperCase();
    const curpRegex = /^[A-Z0-9]{18,20}$/;
    if (!curpRegex.test(normalizedCurp)) {
      return NextResponse.json(
        { found: false, error: "CURP inválido" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // 1. Look up student by CURP
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("id, first_name, last_name, institution_id, curp")
      .eq("curp", normalizedCurp)
      .is("deleted_at", null)
      .maybeSingle();

    if (studentErr) {
      return NextResponse.json(
        { error: "Error al buscar alumno", message: studentErr.message },
        { status: 500 },
      );
    }

    if (!student) {
      return NextResponse.json({ found: false });
    }

    // 2. Check if already assigned to this tutor
    const { data: existingAssignment } = await admin
      .from("student_tutors")
      .select("id")
      .eq("student_id", student.id)
      .eq("tutor_profile_id", profile.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json({
        found: true,
        alreadyAssigned: true,
        student: {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
        },
      });
    }

    // 3. Check for a pending request
    const { data: pendingRequest } = await admin
      .from("tutor_student_requests")
      .select("id")
      .eq("student_id", student.id)
      .eq("tutor_profile_id", profile.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRequest) {
      return NextResponse.json({
        found: true,
        requestPending: true,
        student: {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
        },
      });
    }

    // 4. Fetch grade from active enrollment
    const { data: enrollment } = await admin
      .from("student_enrollments")
      .select("grade_id, classrooms(grade_id)")
      .eq("student_id", student.id)
      .eq("active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const grade =
      (enrollment?.classrooms as { grade_id: number | null } | null)?.grade_id ??
      enrollment?.grade_id ??
      null;

    // 5. Fetch institution name
    const { data: institution } = await admin
      .from("institutions")
      .select("name")
      .eq("id", student.institution_id)
      .single();

    return NextResponse.json({
      found: true,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade,
        institution: institution?.name ?? null,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
