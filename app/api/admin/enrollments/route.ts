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

    const { data: classroom } = await admin
      .from("classrooms")
      .select("id, institution_id")
      .eq("id", classroomId)
      .is("deleted_at", null)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: "Salón no encontrado" }, { status: 404 });
    }

    if (profile.role === "admin" && profile.institution_id !== classroom.institution_id) {
      return NextResponse.json({ error: "No autorizado para este salón" }, { status: 403 });
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
      .eq("active", true)
      .is("deleted_at", null)
      .order("enrolled_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Error al listar inscripciones", message: error.message },
        { status: 500 }
      );
    }

    const list = (enrollments ?? []).map((e: any) => ({
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
      return NextResponse.json({ error: "No puedes inscribir en otra institución" }, { status: 403 });
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
      return NextResponse.json({ error: "Alumno y salón no pertenecen a la misma institución" }, { status: 400 });
    }

    // 🔒 BLOQUEO: verificar si ya tiene inscripción activa en ese grado
    const { data: existing } = await admin
      .from("student_enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("grade_id", classroom.grade_id)
      .eq("active", true)
      .is("deleted_at", null);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "El alumno ya está inscrito en un salón de este grado" },
        { status: 409 }
      );
    }

    // ✅ Insertar nueva inscripción
    const { data, error } = await admin
      .from("student_enrollments")
      .insert({
        student_id: studentId,
        classroom_id: classroomId,
        grade_id: classroom.grade_id,
        active: true,
        institution_id: classroom.institution_id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, student_id, classroom_id, grade_id, enrolled_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al inscribir", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ enrollment: data }, { status: 201 });

  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
  
}
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const enrollmentId = url.searchParams.get("id");

    if (!enrollmentId) {
      return NextResponse.json({ error: "Falta id de inscripción" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: enrollment } = await admin
      .from("student_enrollments")
      .select("id, classroom_id, active")
      .eq("id", enrollmentId)
      .is("deleted_at", null)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    if (!enrollment.active) {
      return NextResponse.json({ error: "La inscripción ya está inactiva" }, { status: 400 });
    }

    const { error } = await admin
      .from("student_enrollments")
      .update({
        active: false,
        updated_by: user.id,
      })
      .eq("id", enrollmentId);

    if (error) {
      return NextResponse.json(
        { error: "Error al dar de baja", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

