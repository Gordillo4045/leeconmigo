import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
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

    const { notificationId } = await params;
    const admin = createAdminClient();

    const { data: notif, error: notifErr } = await admin
      .from("notifications")
      .select("related_attempt_id, is_read")
      .eq("id", notificationId)
      .eq("recipient_profile_id", profile.id)
      .single();

    if (notifErr || !notif || !notif.related_attempt_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: attempt, error: attemptErr } = await admin
      .from("evaluation_attempts")
      .select("student_id, session_id, score_percent, correct_count, total_questions, submitted_at")
      .eq("id", notif.related_attempt_id)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("first_name, last_name")
      .eq("id", attempt.student_id)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { data: session, error: sessionErr } = await admin
      .from("evaluation_sessions")
      .select("quiz_id")
      .eq("id", attempt.session_id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: questionRows, error: questionsErr } = await admin
      .from("quiz_questions")
      .select("id, prompt, order_index, quiz_options(id, option_text, order_index, is_correct)")
      .eq("quiz_id", session.quiz_id)
      .order("order_index");

    if (questionsErr) {
      return NextResponse.json(
        { error: "No se pudieron obtener las preguntas", message: questionsErr.message },
        { status: 500 },
      );
    }

    const { data: answers, error: answersErr } = await admin
      .from("attempt_answers")
      .select("question_id, selected_option_id, is_correct")
      .eq("attempt_id", notif.related_attempt_id);

    if (answersErr) {
      return NextResponse.json(
        { error: "No se pudieron obtener las respuestas", message: answersErr.message },
        { status: 500 },
      );
    }

    const answerMap = Object.fromEntries(
      (answers ?? []).map((a) => [a.question_id, a]),
    );

    const questions = (questionRows ?? []).map((q) => ({
      questionId: q.id,
      prompt: q.prompt,
      options: (q.quiz_options ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((o: any) => ({
          optionId: o.id,
          text: o.option_text,
          isCorrect: o.is_correct,
        })),
      studentSelectedOptionId: answerMap[q.id]?.selected_option_id ?? null,
      studentIsCorrect: answerMap[q.id]?.is_correct ?? null,
    }));

    return NextResponse.json({
      studentName: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Sin nombre",
      submittedAt: attempt.submitted_at,
      scorePercent: attempt.score_percent,
      correctCount: attempt.correct_count,
      totalQuestions: attempt.total_questions,
      questions,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
