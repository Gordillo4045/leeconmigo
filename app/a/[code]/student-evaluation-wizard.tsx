"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { EvaluationResult } from "@/components/evaluation/types";
import type { EvaluationWizardData } from "@/components/evaluation/evaluation-wizard";

const EvaluationWizard = dynamic(
  () => import("@/components/evaluation/evaluation-wizard").then((m) => m.default),
  { ssr: false }
);

type OpenAttemptPayload = {
  attempt_id: string;
  session_id: string;
  expires_at: string;
  text: { title: string; topic: string; grade: number; difficulty: string; content: string };
  questions: Array<{
    question_id: string;
    q: string;
    options: Array<{ option_id: string; text: string }>;
  }>;
  inference_statements?: Array<{
    id: string;
    statement: string;
    context_fragment: string;
    correct_answer: string;
    order: number;
  }>;
  vocabulary_pairs?: Array<{ id: string; word: string; definition: string; order: number }>;
  sequence_items?: Array<{ id: string; text: string; correct_order: number }>;
};

function mapPayloadToWizardData(payload: OpenAttemptPayload): EvaluationWizardData {
  const text = {
    id: payload.attempt_id,
    title: payload.text.title,
    content: payload.text.content,
    gradeLevel: payload.text.grade,
    wordCount: payload.text.content.split(/\s+/).length,
    estimatedReadingTime: Math.ceil(payload.text.content.split(/\s+/).length / 60) * 60,
  };

  const comprehensionQuestions = payload.questions.map((q, i) => ({
    id: q.question_id,
    textId: payload.attempt_id,
    question: q.q,
    options: q.options.map((o) => o.text),
    correctAnswerIndex: 0,
    order: i + 1,
  }));

  const inferenceStatements = (payload.inference_statements ?? []).map((s) => ({
    id: s.id,
    textId: payload.attempt_id,
    statement: s.statement,
    contextFragment: s.context_fragment,
    correctAnswer: (s.correct_answer as "verdadero" | "falso" | "indeterminado") || "indeterminado",
    order: s.order,
  }));

  const vocabularyPairs = (payload.vocabulary_pairs ?? []).map((p, i) => ({
    id: p.id,
    textId: payload.attempt_id,
    word: p.word,
    definition: p.definition,
    order: p.order ?? i + 1,
  }));

  const sequenceItems = (payload.sequence_items ?? []).map((s) => ({
    id: s.id,
    textId: payload.attempt_id,
    text: s.text,
    correctOrder: s.correct_order,
  }));

  return {
    text,
    comprehensionQuestions,
    inferenceStatements,
    vocabularyPairs,
    sequenceItems,
  };
}

type SubmitApiResult = {
  attempt_id: string;
  total_questions: number;
  correct_count: number;
  score_percent: number;
};

export function StudentEvaluationWizard({
  payload,
  onSubmitted,
  onError,
}: {
  payload: OpenAttemptPayload;
  onSubmitted: (apiResult?: SubmitApiResult) => void;
  onError: (message: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const wizardData = mapPayloadToWizardData(payload);

  const handleSubmit = async (result: EvaluationResult) => {
    setSubmitting(true);
    try {
      const readingTimeMs = Math.round((result.reading?.readingTime ?? 0) * 1000);

      const answers = result.comprehension.map((a) => {
        const q = payload.questions.find((qq) => qq.question_id === a.questionId);
        const idx = typeof a.selectedAnswer === "number" ? a.selectedAnswer : 0;
        const optionId = q?.options[idx]?.option_id;
        return optionId ? { question_id: a.questionId, option_id: optionId } : null;
      }).filter(Boolean) as Array<{ question_id: string; option_id: string }>;

      const inference_answers = result.inference.map((a) => ({
        statement_id: a.questionId,
        selected_answer: a.selectedAnswer as "verdadero" | "falso" | "indeterminado",
      }));

      const vocabulary_answers = result.vocabulary.map((m) => ({
        vocabulary_pair_id: m.wordId,
        selected_pair_id: m.selectedDefinitionId,
      }));

      const sequence_answers = result.sequenceOrder.map((id, i) => ({
        sequence_item_id: id,
        position: i + 1,
      }));

      const res = await fetch("/api/student/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          attempt_id: payload.attempt_id,
          reading_time_ms: readingTimeMs,
          answers,
          inference_answers,
          vocabulary_answers,
          sequence_answers,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al enviar");

      onSubmitted(json.result as SubmitApiResult);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al enviar respuestas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EvaluationWizard
      data={wizardData}
      onSubmit={handleSubmit}
      isSubmitting={submitting}
    />
  );
}
