"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EvaluationConfigPanel } from "@/components/evaluation/evaluation-config-panel";
import type { EvaluationConfigPanelData } from "@/components/evaluation/evaluation-config-panel";

function mapApiResponseToData(json: {
  ok?: boolean;
  error?: string;
  message?: string;
  text: { id: string; title?: string; content?: string; grade_id: number };
  questions?: Array<{ question_id: string; prompt: string; options: Array<{ option_text: string; is_correct: boolean }> }>;
  inference_statements?: Array<{ id: string; statement: string; context_fragment: string; correct_answer: string; order_index: number }>;
  vocabulary_pairs?: Array<{ id: string; word: string; definition: string; order_index: number }>;
  sequence_items?: Array<{ id: string; text: string; correct_order: number }>;
  quiz_id?: string | null;
}): EvaluationConfigPanelData {
  const text = json.text;
  const questions = json.questions ?? [];
  const inference_statements = json.inference_statements ?? [];
  const vocabulary_pairs = json.vocabulary_pairs ?? [];
  const sequence_items = json.sequence_items ?? [];
  const quizId = json.quiz_id ?? null;
  return {
    quizId,
    text: {
      id: text.id,
      title: text.title ?? "",
      content: text.content ?? "",
      gradeLevel: text.grade_id ?? 1,
      wordCount: (text.content?.split(/\s+/)?.length) ?? 0,
      estimatedReadingTime: 120,
    },
    comprehensionQuestions: questions.map((q, i) => ({
      id: q.question_id,
      textId: text.id,
      question: q.prompt,
      options: q.options.map((o) => o.option_text),
      correctAnswerIndex: q.options.findIndex((o) => o.is_correct),
      order: i + 1,
    })),
    inferenceStatements: inference_statements.map((s) => ({
      id: s.id,
      textId: text.id,
      statement: s.statement,
      contextFragment: s.context_fragment ?? "",
      correctAnswer: (s.correct_answer as "verdadero" | "falso" | "indeterminado") || "indeterminado",
      order: s.order_index ?? 0,
    })),
    vocabularyPairs: vocabulary_pairs.map((p) => ({
      id: p.id,
      textId: text.id,
      word: p.word,
      definition: p.definition,
      order: p.order_index ?? 0,
    })),
    sequenceItems: sequence_items.map((s) => ({
      id: s.id,
      textId: text.id,
      text: s.text,
      correctOrder: s.correct_order,
    })),
  };
}

export default function MasterConfigurarPage() {
  const params = useParams();
  const textId = params?.textId as string | undefined;
  const [data, setData] = useState<EvaluationConfigPanelData | null>(null);
  const [loading, setLoading] = useState(!!textId);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!textId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(textId)}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json?.message ?? json?.error ?? "Error al cargar");
        setData(null);
        return;
      }
      setData(mapApiResponseToData(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [textId]);

  useEffect(() => {
    if (!textId) {
      setError("Falta ID de plantilla");
      return;
    }
    loadTemplate();
  }, [textId, loadTemplate]);

  if (!textId) {
    return (
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <p className="text-muted-foreground">Falta ID de plantilla.</p>
        <Button asChild variant="outline"><Link href="/master/plantillas">Volver a Plantillas</Link></Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <p className="text-muted-foreground">Cargando plantilla…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <p className="text-destructive">{error ?? "No se pudo cargar la plantilla."}</p>
        <Button asChild variant="outline"><Link href="/master/plantillas">Volver a Plantillas</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/master/plantillas">← Plantillas</Link>
        </Button>
      </div>
      <EvaluationConfigPanel initialData={data} textId={textId} onRefresh={loadTemplate} />
    </div>
  );
}
