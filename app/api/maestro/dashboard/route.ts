import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AttemptRow = {
  id: string;
  student_id: string;
  score_percent: number | null;
  correct_count: number | null;
  total_questions: number | null;
  submitted_at: string | null;
  status: string;
};

type EnrollmentRow = {
  student_id: string;
  grade_id: number | null;
};

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export async function GET() {
  try {
    // 1) Usamos el client normal para leer al usuario autenticado (cookies de Next)
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = user.id;

    // 2) Usamos admin client solo para consultar tablas con RLS complicada,
    // siempre filtrando manualmente por el maestro.
    const admin = createAdminClient();

    // 1) Obtener salones asignados al maestro
    const { data: classroomTeachers, error: ctError } = await admin
      .from("classroom_teachers")
      .select("classroom_id")
      .eq("teacher_profile_id", teacherId);

    if (ctError) {
      return NextResponse.json(
        { error: "No se pudieron obtener los salones", message: ctError.message },
        { status: 500 },
      );
    }

    if (!classroomTeachers || classroomTeachers.length === 0) {
      // Maestro sin salones aún: devolver dashboard vacío pero válido
      return NextResponse.json(
        {
          totalStudents: 0,
          totalEvaluations: 0,
          studentsAtRisk: 0,
          avgScorePercent: null,
          students: [],
        },
        { status: 200 },
      );
    }

    const classroomIds = classroomTeachers.map((ct) => ct.classroom_id).filter(Boolean);
    if (classroomIds.length === 0) {
      return NextResponse.json(
        {
          totalStudents: 0,
          totalEvaluations: 0,
          studentsAtRisk: 0,
          avgScorePercent: null,
          students: [],
        },
        { status: 200 },
      );
    }

    // 2) Inscripciones activas de esos salones
    const { data: enrollments, error: enrollError } = await admin
      .from("student_enrollments")
      .select("student_id, grade_id")
      .in("classroom_id", classroomIds)
      .eq("active", true)
      .is("deleted_at", null);

    if (enrollError) {
      return NextResponse.json(
        { error: "No se pudieron obtener las inscripciones", message: enrollError.message },
        { status: 500 },
      );
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json(
        {
          totalStudents: 0,
          totalEvaluations: 0,
          studentsAtRisk: 0,
          avgScorePercent: null,
          students: [],
        },
        { status: 200 },
      );
    }

    const enrollmentRows = enrollments as EnrollmentRow[];
    const studentIds = Array.from(new Set(enrollmentRows.map((e) => e.student_id))).filter(Boolean);

    if (studentIds.length === 0) {
      return NextResponse.json(
        {
          totalStudents: 0,
          totalEvaluations: 0,
          studentsAtRisk: 0,
          avgScorePercent: null,
          students: [],
        },
        { status: 200 },
      );
    }

    // 3) Datos básicos de alumnos
    const { data: students, error: studentsError } = await admin
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds)
      .is("deleted_at", null);

    if (studentsError) {
      return NextResponse.json(
        { error: "No se pudieron obtener los alumnos", message: studentsError.message },
        { status: 500 },
      );
    }

    const studentRows = (students ?? []) as StudentRow[];

    // 4) Intentos de evaluación enviados de esos alumnos
    const { data: attempts, error: attemptsError } = await admin
      .from("evaluation_attempts")
      .select(
        "id, student_id, score_percent, correct_count, total_questions, submitted_at, status, deleted_at",
      )
      .in("student_id", studentIds)
      .eq("status", "submitted");

    if (attemptsError) {
      return NextResponse.json(
        { error: "No se pudieron obtener las evaluaciones", message: attemptsError.message },
        { status: 500 },
      );
    }

    const attemptRows = ((attempts ?? []) as AttemptRow[]).filter(
      // @ts-expect-error deleted_at viene en el select aunque no esté tipado en AttemptRow
      (a) => !a.deleted_at,
    );

    const totalStudents = studentRows.length;
    const totalEvaluations = attemptRows.length;

    type Risk = "low" | "medium" | "high";

    function computeScore(a: AttemptRow): number | null {
      if (a.score_percent != null) return a.score_percent;
      if (a.correct_count != null && a.total_questions != null && a.total_questions > 0) {
        return (a.correct_count / a.total_questions) * 100;
      }
      return null;
    }

    function computeRisk(score: number | null): Risk {
      if (score == null) return "low";
      if (score < 60) return "high";
      if (score < 80) return "medium";
      return "low";
    }

    const byStudent = new Map<
      string,
      {
        latest: AttemptRow | null;
        previous: AttemptRow | null;
      }
    >();

    for (const a of attemptRows) {
      const key = a.student_id;
      const existing = byStudent.get(key);
      const submittedTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;

      if (!existing) {
        byStudent.set(key, { latest: a, previous: null });
      } else {
        const latestTime = existing.latest?.submitted_at
          ? new Date(existing.latest.submitted_at).getTime()
          : 0;
        if (submittedTime >= latestTime) {
          byStudent.set(key, { latest: a, previous: existing.latest });
        } else if (!existing.previous) {
          byStudent.set(key, { latest: existing.latest, previous: a });
        }
      }
    }

    let sumScores = 0;
    let countScores = 0;
    let studentsAtRisk = 0;

    const studentsPayload = studentRows.map((s) => {
      const enrollment = enrollmentRows.find((e) => e.student_id === s.id);
      const attemptsForStudent = byStudent.get(s.id);
      const latest = attemptsForStudent?.latest ?? null;
      const prev = attemptsForStudent?.previous ?? null;

      const latestScore = latest ? computeScore(latest) : null;
      const prevScore = prev ? computeScore(prev) : null;

      let trend: "improving" | "stable" | "declining" | null = null;
      if (latestScore != null && prevScore != null) {
        if (latestScore - prevScore > 5) trend = "improving";
        else if (prevScore - latestScore > 5) trend = "declining";
        else trend = "stable";
      }

      const risk = computeRisk(latestScore);

      if (latestScore != null) {
        sumScores += latestScore;
        countScores += 1;
      }
      if (risk === "high") {
        studentsAtRisk += 1;
      }

      return {
        id: s.id,
        name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Sin nombre",
        grade: enrollment?.grade_id ?? null,
        latestScorePercent: latestScore,
        risk,
        trend,
      };
    });

    const avgScorePercent = countScores > 0 ? sumScores / countScores : null;

    return NextResponse.json(
      {
        totalStudents,
        totalEvaluations,
        studentsAtRisk,
        avgScorePercent,
        students: studentsPayload,
      },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

