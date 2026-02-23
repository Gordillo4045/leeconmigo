import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

type AttemptRow = {
  id: string;
  student_id: string;
  score_percent: number | null;
  correct_count: number | null;
  total_questions: number | null;
  submitted_at: string | null;
  status: string;
};

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

function computeScore(a: AttemptRow): number | null {
  if (a.score_percent != null) return a.score_percent;
  if (a.correct_count != null && a.total_questions != null && a.total_questions > 0) {
    return (a.correct_count / a.total_questions) * 100;
  }
  return null;
}

function computeRisk(score: number | null): "low" | "medium" | "high" {
  if (score == null) return "low";
  if (score < 60) return "high";
  if (score < 80) return "medium";
  return "low";
}

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

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "tutor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const emptyOk = {
      totalStudents: 0,
      totalEvaluations: 0,
      studentsAtRisk: 0,
      avgScorePercent: null,
      students: [],
    };

    const admin = createAdminClient();

    // 1. Alumnos asignados al tutor vía student_tutors
    const { data: assignments, error: assignErr } = await admin
      .from("student_tutors")
      .select("student_id")
      .eq("tutor_profile_id", profile.id)
      .is("deleted_at", null);

    if (assignErr) {
      return NextResponse.json(
        { error: "No se pudieron obtener las asignaciones", message: assignErr.message },
        { status: 500 },
      );
    }

    const assignedStudentIds = (assignments ?? []).map((a) => a.student_id).filter(Boolean);

    if (!assignedStudentIds.length) {
      return NextResponse.json(emptyOk);
    }

    const { data: students, error: studentsErr } = await admin
      .from("students")
      .select("id, first_name, last_name")
      .in("id", assignedStudentIds)
      .is("deleted_at", null)
      .order("last_name")
      .order("first_name");

    if (studentsErr) {
      return NextResponse.json(
        { error: "No se pudieron obtener los alumnos", message: studentsErr.message },
        { status: 500 },
      );
    }

    if (!students?.length) {
      return NextResponse.json(emptyOk);
    }

    const studentRows = students as StudentRow[];
    const studentIds = studentRows.map((s) => s.id);

    // 2. Intentos enviados
    const { data: attempts, error: attemptsErr } = await admin
      .from("evaluation_attempts")
      .select(
        "id, student_id, score_percent, correct_count, total_questions, submitted_at, status, deleted_at",
      )
      .in("student_id", studentIds)
      .eq("status", "submitted");

    if (attemptsErr) {
      return NextResponse.json(
        { error: "No se pudieron obtener las evaluaciones", message: attemptsErr.message },
        { status: 500 },
      );
    }

    const attemptRows = ((attempts ?? []) as (AttemptRow & { deleted_at: string | null })[]).filter(
      (a) => !a.deleted_at,
    ) as AttemptRow[];

    const totalEvaluations = attemptRows.length;

    // Agrupar: latest y previous por alumno
    const byStudent = new Map<string, { latest: AttemptRow | null; previous: AttemptRow | null }>();

    for (const a of attemptRows) {
      const existing = byStudent.get(a.student_id);
      const submittedTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;

      if (!existing) {
        byStudent.set(a.student_id, { latest: a, previous: null });
      } else {
        const latestTime = existing.latest?.submitted_at
          ? new Date(existing.latest.submitted_at).getTime()
          : 0;
        if (submittedTime >= latestTime) {
          byStudent.set(a.student_id, { latest: a, previous: existing.latest });
        } else if (!existing.previous) {
          byStudent.set(a.student_id, { latest: existing.latest, previous: a });
        }
      }
    }

    let sumScores = 0;
    let countScores = 0;
    let studentsAtRisk = 0;

    const studentsPayload = studentRows.map((s) => {
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
      if (risk === "high") studentsAtRisk += 1;

      return {
        id: s.id,
        name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Sin nombre",
        latestScorePercent: latestScore,
        risk,
        trend,
      };
    });

    const avgScorePercent = countScores > 0 ? sumScores / countScores : null;

    return NextResponse.json({
      totalStudents: studentRows.length,
      totalEvaluations,
      studentsAtRisk,
      avgScorePercent,
      students: studentsPayload,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
