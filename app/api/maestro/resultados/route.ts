import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AttemptRow = {
  id: string;
  student_id: string;
  score_percent: number | null;
  submitted_at: string | null;
  reading_time_ms: number | null;
};

type AnswerRow = {
  attempt_id: string;
  is_correct: boolean;
};

function getISOWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
  );
  return `${d.getFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}

function computeCategoryAvg(rows: AnswerRow[], attemptIds: Set<string>): number | null {
  const byAttempt = new Map<string, { total: number; correct: number }>();

  for (const r of rows) {
    if (!attemptIds.has(r.attempt_id)) continue;
    const prev = byAttempt.get(r.attempt_id) ?? { total: 0, correct: 0 };
    byAttempt.set(r.attempt_id, {
      total: prev.total + 1,
      correct: prev.correct + (r.is_correct ? 1 : 0),
    });
  }

  let sum = 0;
  let count = 0;
  for (const { total, correct } of byAttempt.values()) {
    if (total > 0) {
      sum += (correct / total) * 100;
      count++;
    }
  }
  return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
}

function emptyResponse() {
  return {
    totalAttempts: 0,
    avgScorePercent: null,
    avgReadingTimeSec: null,
    scoreDistribution: { excellent: 0, good: 0, needsImprovement: 0 },
    categoryAverages: { comprension: null, inferencia: null, vocabulario: null },
    scoreTrend: [],
  };
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

    const admin = createAdminClient();

    // 1. Salones del maestro
    const { data: classroomTeachers, error: ctErr } = await admin
      .from("classroom_teachers")
      .select("classroom_id")
      .eq("teacher_profile_id", user.id);

    if (ctErr || !classroomTeachers?.length) {
      return NextResponse.json(emptyResponse());
    }

    const classroomIds = classroomTeachers.map((ct) => ct.classroom_id).filter(Boolean);

    // 2. Inscripciones activas
    const { data: enrollments, error: enrollErr } = await admin
      .from("student_enrollments")
      .select("student_id")
      .in("classroom_id", classroomIds)
      .eq("active", true)
      .is("deleted_at", null);

    if (enrollErr || !enrollments?.length) {
      return NextResponse.json(emptyResponse());
    }

    const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id))).filter(Boolean);

    // 3. Intentos enviados
    const { data: attempts, error: attemptsErr } = await admin
      .from("evaluation_attempts")
      .select("id, student_id, score_percent, submitted_at, reading_time_ms, deleted_at")
      .in("student_id", studentIds)
      .eq("status", "submitted");

    if (attemptsErr || !attempts?.length) {
      return NextResponse.json(emptyResponse());
    }

    // Filtrar soft-deleted
    const validAttempts = (attempts as (AttemptRow & { deleted_at: string | null })[]).filter(
      (a) => !a.deleted_at,
    ) as AttemptRow[];

    if (!validAttempts.length) {
      return NextResponse.json(emptyResponse());
    }

    const attemptIds = validAttempts.map((a) => a.id);
    const attemptIdSet = new Set(attemptIds);

    // 4. Respuestas por categoría (en paralelo)
    const [compResult, infResult, vocResult] = await Promise.all([
      admin
        .from("attempt_answers")
        .select("attempt_id, is_correct")
        .in("attempt_id", attemptIds),
      admin
        .from("attempt_inference_answers")
        .select("attempt_id, is_correct")
        .in("attempt_id", attemptIds),
      admin
        .from("attempt_vocabulary_answers")
        .select("attempt_id, is_correct")
        .in("attempt_id", attemptIds),
    ]);

    const compAnswers = (compResult.data ?? []) as AnswerRow[];
    const infAnswers = (infResult.data ?? []) as AnswerRow[];
    const vocAnswers = (vocResult.data ?? []) as AnswerRow[];

    // 5. Métricas generales
    const totalAttempts = validAttempts.length;

    const attemptsWithScore = validAttempts.filter((a) => a.score_percent != null);
    const avgScorePercent =
      attemptsWithScore.length > 0
        ? Math.round(
            (attemptsWithScore.reduce((s, a) => s + a.score_percent!, 0) /
              attemptsWithScore.length) *
              10,
          ) / 10
        : null;

    const attemptsWithTime = validAttempts.filter((a) => a.reading_time_ms != null && a.reading_time_ms > 0);
    const avgReadingTimeSec =
      attemptsWithTime.length > 0
        ? Math.round(
            attemptsWithTime.reduce((s, a) => s + a.reading_time_ms!, 0) /
              attemptsWithTime.length /
              1000,
          )
        : null;

    // 6. Distribución de puntajes (último intento por alumno)
    const latestByStudent = new Map<string, AttemptRow>();
    for (const a of validAttempts) {
      const current = latestByStudent.get(a.student_id);
      if (!current) {
        latestByStudent.set(a.student_id, a);
      } else {
        const currentTime = current.submitted_at ? new Date(current.submitted_at).getTime() : 0;
        const newTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        if (newTime > currentTime) {
          latestByStudent.set(a.student_id, a);
        }
      }
    }

    const scoreDistribution = { excellent: 0, good: 0, needsImprovement: 0 };
    for (const attempt of latestByStudent.values()) {
      const score = attempt.score_percent;
      if (score == null) continue;
      if (score >= 80) scoreDistribution.excellent++;
      else if (score >= 60) scoreDistribution.good++;
      else scoreDistribution.needsImprovement++;
    }

    // 7. Promedios por categoría
    const categoryAverages = {
      comprension: computeCategoryAvg(compAnswers, attemptIdSet),
      inferencia: computeCategoryAvg(infAnswers, attemptIdSet),
      vocabulario: computeCategoryAvg(vocAnswers, attemptIdSet),
    };

    // 8. Tendencia semanal (últimas 8 semanas con datos)
    const byWeek = new Map<string, { sum: number; count: number }>();
    for (const a of validAttempts) {
      if (!a.submitted_at || a.score_percent == null) continue;
      const weekLabel = getISOWeekLabel(new Date(a.submitted_at));
      const prev = byWeek.get(weekLabel) ?? { sum: 0, count: 0 };
      byWeek.set(weekLabel, { sum: prev.sum + a.score_percent, count: prev.count + 1 });
    }

    const scoreTrend = Array.from(byWeek.entries())
      .map(([week, { sum, count }]) => ({
        week,
        avgScore: Math.round((sum / count) * 10) / 10,
        attempts: count,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);

    return NextResponse.json({
      totalAttempts,
      avgScorePercent,
      avgReadingTimeSec,
      scoreDistribution,
      categoryAverages,
      scoreTrend,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
