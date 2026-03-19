"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, Target, BarChart3, Clock } from "lucide-react";
import { StudentCard } from "@/components/tutor/student-card";

type RiskLevel = "low" | "medium" | "high";

type Attempt = {
  id: string;
  scorePercent: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  submittedAt: string | null;
  readingTimeSec: number | null;
};

type DashboardStudent = {
  id: string;
  name: string;
  latestScorePercent: number | null;
  risk: RiskLevel;
  trend: "improving" | "stable" | "declining" | null;
  attempts: Attempt[];
};

type DashboardData = {
  totalStudents: number;
  totalEvaluations: number;
  studentsAtRisk: number;
  avgScorePercent: number | null;
  students: DashboardStudent[];
};

export default function TutorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/tutor/dashboard");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        if (!cancelled) setData(json as DashboardData);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar el dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const totalStudents = data?.totalStudents ?? 0;
  const totalEvaluations = data?.totalEvaluations ?? 0;
  const studentsAtRisk = data?.studentsAtRisk ?? 0;
  const avgScorePercent = data?.avgScorePercent ?? null;
  const students = data?.students ?? [];

  const sortedStudents = [...students].sort((a, b) => {
    const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
    return order[a.risk] - order[b.risk];
  });

  if (!loading && !error && data !== null && totalStudents === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card className="border-border bg-muted/30">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">Sin alumnos asignados</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tu cuenta está activa, pero aún no tienes alumnos asignados. El maestro de tu hijo/a
              te asignará próximamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {error && (
        <Card className="mb-6 border-destructive/40 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total alumnos"
          value={loading ? "…" : totalStudents.toString()}
          icon={<Users className="h-5 w-5" />}
          description={`${totalEvaluations} evaluaciones registradas`}
        />
        <SummaryCard
          title="Alumnos en riesgo"
          value={loading ? "…" : studentsAtRisk.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="Último intento con puntaje < 60%"
          variant="warning"
        />
        <SummaryCard
          title="Puntaje promedio"
          value={loading ? "…" : avgScorePercent != null ? avgScorePercent.toFixed(1) : "—"}
          unit={avgScorePercent != null ? "%" : undefined}
          icon={<Target className="h-5 w-5" />}
          description="Promedio de tus alumnos asignados"
        />
        <SummaryCard
          title="Con evaluaciones"
          value={loading ? "…" : students.filter((s) => s.latestScorePercent != null).length.toString()}
          icon={<BarChart3 className="h-5 w-5" />}
          description="Alumnos con al menos un intento"
        />
      </div>

      {/* Por alumno */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Resultados por alumno</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : sortedStudents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay alumnos asignados aún.
          </p>
        ) : (
          sortedStudents.map((s) => (
            <StudentCard
              key={s.id}
              id={s.id}
              name={s.name}
              latestScorePercent={s.latestScorePercent}
              risk={s.risk}
              trend={s.trend}
              attempts={s.attempts}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title, value, unit, icon, description, variant = "default",
}: {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  description: string;
  variant?: "default" | "warning";
}) {
  return (
    <Card className={variant === "warning" ? "border-warning/50" : ""}>
      <CardContent className="pt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className={variant === "warning" ? "text-warning" : "text-primary"}>{icon}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
