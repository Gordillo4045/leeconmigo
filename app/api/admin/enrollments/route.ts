import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const classroomId = url.searchParams.get("classroom_id");
    if (!classroomId) {
      return NextResponse.json({ error: "Falta classroom_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (profile.role === "admin" && profile.institution_id) {
      const { data: classroom } = await admin
        .from("classrooms")
        .select("id, institution_id")
        .eq("id", classroomId)
        .is("deleted_at", null)
        .single();
      if (!classroom || classroom.institution_id !== profile.institution_id) {
        return NextResponse.json({ error: "Salón no encontrado o no pertenece a tu institución" }, { status: 404 });
      }
    }

    const { data: enrollments, error } = await admin
      .from("student_enrollments")
      .select(`
        id,
        student_id,
        enrolled_at,
        active,
        students ( id, curp, first_name, last_name )
      `)
      .eq("classroom_id", classroomId)
      .is("deleted_at", null)
      .order("enrolled_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Error al listar inscripciones", message: error.message }, { status: 500 });
    }

    const list = (enrollments ?? []).map((e: { id: string; student_id: string; enrolled_at: string; active: boolean; students?: { id: string; curp: string; first_name: string; last_name: string } | null }) => ({
      id: e.id,
      student_id: e.student_id,
      enrolled_at: e.enrolled_at,
      active: e.active,
      student: e.students
        ? {
            id: e.students.id,
            curp: e.students.curp,
            first_name: e.students.first_name,
            last_name: e.students.last_name,
          }
        : null,
    }));

    return NextResponse.json({ enrollments: list }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const studentId = body?.student_id;
    const classroomId = body?.classroom_id;
    if (!studentId || !classroomId) {
      return NextResponse.json({ error: "Faltan student_id y classroom_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: classroom } = await admin
      .from("classrooms")
      .select("id, grade_id, institution_id")
      .eq("id", classroomId)
      .is("deleted_at", null)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: "Salón no encontrado" }, { status: 404 });
    }

    if (profile.role === "admin" && profile.institution_id !== classroom.institution_id) {
      return NextResponse.json({ error: "No puedes inscribir en un salón de otra institución" }, { status: 403 });
    }

    const { data: student } = await admin
      .from("students")
      .select("id, institution_id")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    }
    if (student.institution_id !== classroom.institution_id) {
      return NextResponse.json({ error: "El alumno no pertenece a la misma institución que el salón" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("student_enrollments")
      .insert({
        student_id: studentId,
        classroom_id: classroomId,
        grade_id: classroom.grade_id,
        active: true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, student_id, classroom_id, grade_id, enrolled_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "El alumno ya está inscrito en este salón o en el mismo grado" }, { status: 409 });
      }
      return NextResponse.json({ error: "Error al inscribir", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ enrollment: data }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
