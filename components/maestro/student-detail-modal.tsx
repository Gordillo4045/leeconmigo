"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type RiskLevel = "low" | "medium" | "high";

export type MaestroDashboardStudent = {
  id: string;
  name: string;
  grade: number | null;
  latestScorePercent: number | null;
  risk: RiskLevel;
  trend: "improving" | "stable" | "declining" | null;
};

type AttemptHistoryItem = {
  attempt_id: string;
  submitted_at: string | null;
  score_percent: number | null;
  correct_count: number | null;
  total_questions: number | null;
  reading_time_ms: number | null;
  text_title: string | null;
};

type StudentDetails = {
  student_id: string;
  attempts: AttemptHistoryItem[];
};

type StudentDetailModalProps = {
  student: MaestroDashboardStudent;
  onClose: () => void;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function formatSeconds(ms: number | null) {
  if (ms == null) return "—";
  return `${Math.max(0, Math.round(ms / 1000))} s`;
}

function computeScorePercent(a: AttemptHistoryItem): number | null {
  if (a.score_percent != null) return a.score_percent;
  if (a.correct_count != null && a.total_questions != null && a.total_questions > 0) {
    return (a.correct_count / a.total_questions) * 100;
  }
  return null;
}

export function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  const [details, setDetails] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const res = await fetch(`/api/maestro/students/${student.id}`, { signal: ac.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        if (!cancelled) setDetails(json as StudentDetails);
      } catch (e: any) {
        if (cancelled) return;
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "No se pudieron cargar los detalles.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [student.id]);

  const attempts = details?.attempts ?? [];
  const latestAttempt = attempts[0] ?? null;

  const latestScore = useMemo(() => {
    if (latestAttempt) return computeScorePercent(latestAttempt);
    return student.latestScorePercent;
  }, [latestAttempt, student.latestScorePercent]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl rounded-lg bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{student.name}</p>
            <p className="text-xs text-muted-foreground">
              {student.grade ? `${student.grade}° grado` : "Sin grado asignado"}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </Button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Último puntaje</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="text-xl font-semibold">{latestScore != null ? `${latestScore.toFixed(1)}%` : "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {latestAttempt ? `Enviado: ${formatDate(latestAttempt.submitted_at)}` : "Sin intentos enviados"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tendencia</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="text-base font-semibold">
                  {student.trend === "improving"
                    ? "Mejorando"
                    : student.trend === "declining"
                    ? "Bajando"
                    : "Estable"}
                </div>
                <div className="text-xs text-muted-foreground">Comparando último vs anterior</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Riesgo</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="text-base font-semibold">
                  {student.risk === "high" ? "Alto" : student.risk === "medium" ? "Medio" : "Bajo"}
                </div>
                <div className="text-xs text-muted-foreground">Según el último puntaje</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Historial de intentos</p>
              {loading ? <p className="text-xs text-muted-foreground">Cargando…</p> : null}
            </div>

            {!loading && attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay intentos enviados para este alumno.</p>
            ) : null}

            <div className="space-y-2">
              {attempts.map((a) => {
                const score = computeScorePercent(a);
                return (
                  <div key={a.attempt_id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{a.text_title ?? "Lectura"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(a.submitted_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{score != null ? `${score.toFixed(1)}%` : "—"}</p>
                        <p className="text-xs text-muted-foreground">Lectura: {formatSeconds(a.reading_time_ms)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

