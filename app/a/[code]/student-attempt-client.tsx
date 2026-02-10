"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type OpenAttempt = {
  attempt_id: string;
  session_id: string;
  expires_at: string;
  text: {
    title: string;
    topic: string;
    grade: number;
    difficulty: string;
    content: string;
  };
  questions: Array<{
    question_id: string;
    q: string;
    options: Array<{ option_id: string; text: string }>;
  }>;
};

type SubmitResult = {
  attempt_id: string;
  total_questions: number;
  correct_count: number;
  score_percent: number;
};

type Phase = "loading" | "reading_ready" | "reading" | "quiz" | "done" | "error";

export default function StudentAttemptClient({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState<string | null>(null);

  const [payload, setPayload] = useState<OpenAttempt | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  // métricas (local por ahora)
  const [readingStart, setReadingStart] = useState<number | null>(null);
  const [readingEnd, setReadingEnd] = useState<number | null>(null);

  // respuestas seleccionadas (question_id -> option_id)
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const readingMs = useMemo(() => {
    if (readingStart == null || readingEnd == null) return null;
    return Math.max(0, readingEnd - readingStart);
  }, [readingStart, readingEnd]);

  async function openAttempt() {
    setPhase("loading");
    setErr(null);
    setSubmitResult(null);
    setAnswers({});
    setReadingStart(null);
    setReadingEnd(null);

    try {
      // URL absoluta y sin cookies para que funcione igual logueado o no (alumno sin sesión)
      const url = typeof window !== "undefined" ? `${window.location.origin}/api/student/open-attempt` : "/api/student/open-attempt";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "omit",
      });

      const rawText = await res.text();
      const json = rawText ? (() => { try { return JSON.parse(rawText); } catch { return {}; } })() : {};
      if (!res.ok) {
        const details = json?.details ? JSON.stringify(json.details) : "";
        throw new Error(json?.message || json?.error || details || `HTTP ${res.status}`);
      }

      const result = json.result as OpenAttempt | null;
      if (!result?.text?.content || !Array.isArray(result?.questions)) {
        setPayload(null);
        setPhase("error");
        const msg = json?.error ?? json?.message ?? (json.ok === true ? "No se encontró la evaluación o el código no es válido." : "Respuesta inesperada del servidor. Prueba en otra ventana o sin extensiones.");
        setErr(msg);
        return;
      }

      setPayload(result);
      setPhase("reading_ready");
    } catch (e: any) {
      setPayload(null);
      setPhase("error");
      setErr(e?.message ?? "No se pudo abrir la evaluación.");
    }
  }

  async function submitAttempt() {
    if (!payload) return;

    if (readingMs == null) {
      setErr("Primero completa la lectura (Iniciar lectura → Terminé de leer).");
      return;
    }

    // construir arreglo en el formato del RPC (min 3, max 8)
    const answersArray = payload.questions.map((q) => ({
      question_id: q.question_id,
      option_id: answers[q.question_id],
    }));

    // defensas simples (debería ser true si allAnswered true)
    const missing = answersArray.find((a) => !a.option_id);
    if (missing) {
      setErr("Contesta todas las preguntas antes de enviar.");
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const res = await fetch("/api/student/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: payload.attempt_id,
          reading_time_ms: readingMs,
          answers: answersArray,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = json?.details ? JSON.stringify(json.details) : "";
        throw new Error(json?.message || json?.error || details || `HTTP ${res.status}`);
      }

      setSubmitResult(json.result as SubmitResult);
      setPhase("done");
    } catch (e: any) {
      setErr(e?.message ?? "Error al enviar respuestas.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    openAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const expiresLabel = payload?.expires_at ? new Date(payload.expires_at).toLocaleString() : "";

  const allAnswered = useMemo(() => {
    if (!payload) return false;
    return payload.questions.every((q) => !!answers[q.question_id]);
  }, [payload, answers]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl p-4 space-y-4">
        {phase === "loading" ? (
          <div className="py-8 text-center text-muted-foreground">Cargando evaluación…</div>
        ) : null}

      {phase === "error" ? (
        <div className="space-y-3">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {err ?? "Error"}
          </div>
          <Button onClick={openAttempt}>Reintentar</Button>
        </div>
      ) : null}

      {payload ? (
        <>
          <div className="rounded-lg border p-4 space-y-1">
            <div className="text-lg font-semibold">{payload.text.title}</div>
            <div className="text-sm text-muted-foreground">
              Tema: {payload.text.topic} • Grado: {payload.text.grade}° • Dificultad:{" "}
              {payload.text.difficulty} • Expira: {expiresLabel}
            </div>
          </div>

          {err ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {err}
            </div>
          ) : null}

          {phase === "reading_ready" || phase === "reading" ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">Lectura</div>
                {phase === "reading" ? (
                  <div className="text-xs text-muted-foreground">Cronómetro activo</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Presiona “Iniciar lectura”</div>
                )}
              </div>

              <Separator />

              <p className="whitespace-pre-wrap leading-relaxed text-base">{payload.text.content}</p>

              <div className="flex flex-wrap gap-2">
                {phase === "reading_ready" ? (
                  <Button
                    onClick={() => {
                      setReadingStart(Date.now());
                      setReadingEnd(null);
                      setPhase("reading");
                    }}
                  >
                    Iniciar lectura
                  </Button>
                ) : null}

                {phase === "reading" ? (
                  <Button
                    onClick={() => {
                      setReadingEnd(Date.now());
                      setPhase("quiz");
                    }}
                  >
                    Terminé de leer
                  </Button>
                ) : null}
              </div>

              {readingMs != null ? (
                <div className="text-xs text-muted-foreground">
                  Tiempo de lectura: {(readingMs / 1000).toFixed(1)} s
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === "quiz" ? (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="font-semibold">Preguntas</div>
              <Separator />

              <div className="space-y-4">
                {payload.questions.map((q, idx) => (
                  <div key={q.question_id} className="space-y-2">
                    <div className="text-sm font-medium">
                      {idx + 1}. {q.q}
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {q.options.map((opt) => {
                        const selectedOpt = answers[q.question_id];
                        const isSelected = selectedOpt === opt.option_id;

                        return (
                          <button
                            key={opt.option_id}
                            type="button"
                            className={[
                              "rounded-md border p-3 text-left text-sm transition",
                              isSelected ? "border-primary ring-2 ring-ring" : "hover:bg-accent",
                            ].join(" ")}
                            onClick={() =>
                              setAnswers((a) => ({ ...a, [q.question_id]: opt.option_id }))
                            }
                          >
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhase("reading_ready");
                  }}
                >
                  Volver a lectura
                </Button>

                <Button
                  disabled={!allAnswered || submitting}
                  onClick={submitAttempt}
                  title={!allAnswered ? "Contesta todas las preguntas" : "Enviar respuestas"}
                >
                  {submitting ? "Enviando..." : "Enviar respuestas"}
                </Button>
              </div>

              {!allAnswered ? (
                <div className="text-xs text-muted-foreground">
                  Contesta todas las preguntas para enviar.
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === "done" ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="font-semibold">Listo ✅</div>

              {submitResult ? (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div>
                    ✅ Puntaje: <b>{submitResult.score_percent}%</b>
                  </div>
                  <div>
                    Correctas: {submitResult.correct_count} / {submitResult.total_questions}
                  </div>
                  {readingMs != null ? (
                    <div>Tiempo de lectura: {(readingMs / 1000).toFixed(1)} s</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Resultado no disponible (reintenta enviar).
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPhase("quiz")}>
                  Volver
                </Button>
                <Button variant="outline" onClick={openAttempt}>
                  Recargar intento
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      </div>
    </div>
  );
}
