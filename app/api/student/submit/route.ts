import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const inferenceAnswerEnum = z.enum(["verdadero", "falso", "indeterminado"]);

const bodySchema = z.object({
  attempt_id: z.string().uuid(),
  reading_time_ms: z.number().int().min(0),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      option_id: z.string().uuid(),
    })
  ),
  inference_answers: z
    .array(
      z.object({
        statement_id: z.string().uuid(),
        selected_answer: inferenceAnswerEnum,
      })
    )
    .optional()
    .default([]),
  vocabulary_answers: z
    .array(
      z.object({
        vocabulary_pair_id: z.string().uuid(),
        selected_pair_id: z.string().uuid(),
      })
    )
    .optional()
    .default([]),
  sequence_answers: z
    .array(
      z.object({
        sequence_item_id: z.string().uuid(),
        position: z.number().int().min(1),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { attempt_id, reading_time_ms, answers, inference_answers, vocabulary_answers, sequence_answers } = parsed.data;

    const { data: attempt, error: attemptErr } = await admin
      .from("evaluation_attempts")
      .select("id, session_id")
      .eq("id", attempt_id)
      .is("deleted_at", null)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json(
        { error: "Attempt not found", message: attemptErr?.message ?? "Attempt not found" },
        { status: 404 }
      );
    }

    const { data: session, error: sessionErr } = await admin
      .from("evaluation_sessions")
      .select("text_id, quiz_id")
      .eq("id", attempt.session_id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json(
        { error: "Session not found", message: sessionErr?.message ?? "Session not found" },
        { status: 404 }
      );
    }

    const textId = session.text_id as string;
    const quizId = session.quiz_id as string | null;

    let totalCorrect = 0;
    let totalCount = 0;

    // 1) Comprensión: attempt_answers
    if (quizId && answers.length > 0) {
      for (const a of answers) {
        const { data: opt } = await admin
          .from("quiz_options")
          .select("id, is_correct")
          .eq("id", a.option_id)
          .eq("question_id", a.question_id)
          .single();

        if (opt) {
          const isCorrect = (opt.is_correct as boolean) ?? false;
          await admin.from("attempt_answers").upsert(
            {
              attempt_id,
              question_id: a.question_id,
              selected_option_id: a.option_id,
              is_correct: isCorrect,
            },
            { onConflict: "attempt_id,question_id" }
          );
          totalCount += 1;
          if (isCorrect) totalCorrect += 1;
        }
      }
    }

    // 2) Inferencia
    if (inference_answers.length > 0) {
      const { data: stRows } = await admin
        .from("inference_statements")
        .select("id, correct_answer")
        .eq("text_id", textId)
        .in("id", inference_answers.map((x) => x.statement_id));

      const correctBySt = new Map((stRows ?? []).map((r) => [r.id, (r.correct_answer as string) ?? ""]));

      for (const a of inference_answers) {
        const correctAnswer = correctBySt.get(a.statement_id);
        const isCorrect = correctAnswer != null && correctAnswer === a.selected_answer;
        await admin.from("attempt_inference_answers").upsert(
          {
            attempt_id,
            statement_id: a.statement_id,
            selected_answer: a.selected_answer,
            is_correct: isCorrect,
          },
          { onConflict: "attempt_id,statement_id" }
        );
        totalCount += 1;
        if (isCorrect) totalCorrect += 1;
      }
    }

    // 3) Vocabulario
    if (vocabulary_answers.length > 0) {
      for (const a of vocabulary_answers) {
        const isCorrect = a.vocabulary_pair_id === a.selected_pair_id;
        await admin.from("attempt_vocabulary_answers").upsert(
          {
            attempt_id,
            vocabulary_pair_id: a.vocabulary_pair_id,
            selected_pair_id: a.selected_pair_id,
            is_correct: isCorrect,
          },
          { onConflict: "attempt_id,vocabulary_pair_id" }
        );
        totalCount += 1;
        if (isCorrect) totalCorrect += 1;
      }
    }

    // 4) Secuencia: un solo “ítem” correcto si el orden es correcto
    if (sequence_answers.length > 0) {
      const sortedByPos = [...sequence_answers].sort((x, y) => x.position - y.position);
      const { data: seqRows } = await admin
        .from("sequence_items")
        .select("id, correct_order")
        .eq("text_id", textId);

      const correctOrderByItem = new Map((seqRows ?? []).map((r) => [r.id, (r.correct_order as number) ?? 0]));
      let sequenceCorrect = true;
      for (let i = 0; i < sortedByPos.length; i++) {
        const itemId = sortedByPos[i].sequence_item_id;
        const expectedOrder = correctOrderByItem.get(itemId);
        if (expectedOrder !== i + 1) {
          sequenceCorrect = false;
          break;
        }
      }

      for (const a of sortedByPos) {
        await admin.from("attempt_sequence_answers").upsert(
          {
            attempt_id,
            sequence_item_id: a.sequence_item_id,
            position: a.position,
          },
          { onConflict: "attempt_id,position" }
        );
      }
      totalCount += 1;
      if (sequenceCorrect) totalCorrect += 1;
    }

    const scorePercent = totalCount > 0 ? Math.round((totalCorrect / totalCount) * 100 * 100) / 100 : 0;

    const { error: updateErr } = await admin
      .from("evaluation_attempts")
      .update({
        reading_time_ms,
        total_questions: totalCount,
        correct_count: totalCorrect,
        score_percent: scorePercent,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      })
      .eq("id", attempt_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Update failed", message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result: {
        attempt_id,
        total_questions: totalCount,
        correct_count: totalCorrect,
        score_percent: scorePercent,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
