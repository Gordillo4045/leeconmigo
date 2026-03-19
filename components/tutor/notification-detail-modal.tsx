"use client";

import React, { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuestionOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuestionDetail = {
  id: string;
  prompt: string;
  options: QuestionOption[];
  studentSelectedOptionId: string | null;
  studentIsCorrect: boolean | null;
};

type NotificationDetail = {
  id: string;
  studentName: string;
  submittedAt: string | null;
  scorePercent: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  questions: QuestionDetail[];
};

interface Props {
  notificationId: string | null;
  onClose: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

export function NotificationDetailModal({ notificationId, onClose }: Props) {
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notificationId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setDetail(null);
        const res = await fetch(`/api/tutor/notificaciones/${notificationId}`, {
          signal: ac.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        if (!cancelled) setDetail(json as NotificationDetail);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar el detalle.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [notificationId]);

  if (!notificationId) return null;

  const scoreLabel =
    detail?.scorePercent != null && detail?.correctCount != null && detail?.totalQuestions != null
      ? `${Math.round(detail.scorePercent)}% — ${detail.correctCount}/${detail.totalQuestions} correctas`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-xl bg-card shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div className="min-w-0 pr-4">
            {loading ? (
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            ) : detail ? (
              <>
                <p className="truncate font-semibold text-foreground">{detail.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  Enviado el {formatDate(detail.submittedAt)}
                </p>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {scoreLabel && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {scoreLabel}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-muted"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : detail && detail.questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay preguntas registradas para esta evaluación.
            </p>
          ) : detail ? (
            <div className="space-y-6">
              {detail.questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <p className="font-medium text-foreground">
                    {qi + 1}. {q.prompt}
                  </p>

                  {q.studentSelectedOptionId === null && (
                    <p className="text-sm text-muted-foreground">Sin respuesta</p>
                  )}

                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const isStudentAnswer = opt.id === q.studentSelectedOptionId;
                      const isCorrectOption = opt.isCorrect;
                      const isWrongStudentAnswer = isStudentAnswer && q.studentIsCorrect === false;

                      let containerClass =
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm";

                      if (isCorrectOption) {
                        containerClass +=
                          " border-success/50 bg-success/10 text-foreground";
                      } else if (isWrongStudentAnswer) {
                        containerClass +=
                          " border-destructive/50 bg-destructive/10 text-foreground";
                      } else {
                        containerClass += " border-border bg-background text-foreground";
                      }

                      return (
                        <div key={opt.id} className={containerClass}>
                          <div className="flex items-center gap-2">
                            {isCorrectOption ? (
                              <Check className="h-4 w-4 shrink-0 text-success" />
                            ) : isWrongStudentAnswer ? (
                              <X className="h-4 w-4 shrink-0 text-destructive" />
                            ) : (
                              <span className="h-4 w-4 shrink-0" />
                            )}
                            <span>{opt.text}</span>
                          </div>
                          {isStudentAnswer && (
                            <span className="ml-3 shrink-0 text-xs font-medium text-muted-foreground">
                              Tu respuesta
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
