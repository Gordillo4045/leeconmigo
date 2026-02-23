"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  AlertTriangle,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from "lucide-react";
import { ResultadosSection } from "@/components/maestro/resultados-section";

type RiskLevel = "low" | "medium" | "high";

type DashboardStudent = {
  id: string;
  name: string;
  latestScorePercent: number | null;
  risk: RiskLevel;
  trend: "improving" | "stable" | "declining" | null;
};

type DashboardData = {
  totalStudents: number;
  totalEvaluations: number;
  studentsAtRisk: number;
  avgScorePercent: number | null;
  students: DashboardStudent[];
};

function getRiskBadgeClass(risk: RiskLevel): string {
  if (risk === "high") return "bg-destructive/10 text-destructive border-destructive/40";
  if (risk === "medium") return "bg-warning/10 text-warning-foreground border-warning/40";
  return "bg-success/10 text-success border-success/40";
}

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
    return () => {
      cancelled = true;
    };
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

  // Empty state: loaded, no error, no students assigned
  if (!loading && !error && data !== null && totalStudents === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
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
    <div className="mx-auto max-w-6xl px-4 py-8">
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
          description="Promedio general de la institución"
        />
        <SummaryCard
          title="Con evaluaciones"
          value={
            loading ? "…" : students.filter((s) => s.latestScorePercent != null).length.toString()
          }
          icon={<BarChart3 className="h-5 w-5" />}
          description="Alumnos con al menos una evaluación enviada"
        />
      </div>

      {/* Resultados Section */}
      <ResultadosSection apiUrl="/api/tutor/resultados" />

      {/* Alertas */}
      {!loading && studentsAtRisk > 0 && (
        <Card className="mb-8 border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Atención
            </CardTitle>
            <CardDescription>
              Alumnos con indicadores de posibles dificultades de lectura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedStudents
                .filter((s) => s.risk === "high")
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-destructive/30 bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-sm font-bold text-destructive">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Último puntaje:{" "}
                          {s.latestScorePercent != null
                            ? `${s.latestScorePercent.toFixed(1)}%`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                      Alto riesgo
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de alumnos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Progreso de Alumnos
          </CardTitle>
          <CardDescription>Vista general del desempeño de todos los alumnos de la institución</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : sortedStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay alumnos registrados en esta institución aún.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-12 gap-4 border-b pb-3 text-xs font-medium text-muted-foreground md:grid">
                <div className="col-span-4">Alumno</div>
                <div className="col-span-4">Último puntaje</div>
                <div className="col-span-2">Tendencia</div>
                <div className="col-span-2 text-right">Estado</div>
              </div>
              {sortedStudents.map((s) => (
                <StudentRow key={s.id} student={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  unit,
  icon,
  description,
  variant = "default",
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

function StudentRow({ student }: { student: DashboardStudent }) {
  const TrendIcon =
    student.trend === "improving"
      ? TrendingUp
      : student.trend === "declining"
      ? TrendingDown
      : Minus;

  const trendColor =
    student.trend === "improving"
      ? "text-success"
      : student.trend === "declining"
      ? "text-destructive"
      : "text-muted-foreground";

  const trendLabel =
    student.trend === "improving"
      ? "Mejorando"
      : student.trend === "declining"
      ? "Bajando"
      : "Estable";

  const riskBadge = getRiskBadgeClass(student.risk);
  const hasEval = student.latestScorePercent != null;

  return (
    <div className="w-full rounded-lg border p-4 md:grid md:grid-cols-12 md:items-center md:gap-4 md:p-3">
      {/* Nombre */}
      <div className="col-span-4 mb-3 flex items-center gap-3 md:mb-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            student.risk === "high"
              ? "bg-destructive/10 text-destructive"
              : student.risk === "medium"
              ? "bg-warning/10 text-warning-foreground"
              : "bg-success/10 text-success"
          }`}
        >
          {student.name.charAt(0).toUpperCase()}
        </div>
        <p className="truncate font-medium text-foreground">{student.name}</p>
      </div>

      {/* Puntaje */}
      <div className="col-span-4 hidden md:block">
        <span className="font-semibold text-foreground">
          {hasEval ? `${student.latestScorePercent!.toFixed(1)}%` : "Sin evaluaciones"}
        </span>
        {hasEval && <Progress value={student.latestScorePercent!} className="mt-1 h-1.5" />}
      </div>

      {/* Tendencia */}
      <div className="col-span-2 hidden items-center gap-1 md:flex">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className={`text-sm ${trendColor}`}>{trendLabel}</span>
      </div>

      {/* Estado */}
      <div className="col-span-2 hidden justify-end md:flex">
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${riskBadge}`}>
          {student.risk === "high" ? "Alto" : student.risk === "medium" ? "Medio" : "Bajo"}
        </span>
      </div>

      {/* Mobile */}
      <div className="flex items-center justify-between md:hidden">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {hasEval ? `${student.latestScorePercent!.toFixed(1)}%` : "Sin evaluaciones"}
          </p>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-3 w-3 ${trendColor}`} />
            <span className={`text-xs ${trendColor}`}>{trendLabel}</span>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${riskBadge}`}>
          {student.risk === "high" ? "Alto" : student.risk === "medium" ? "Medio" : "Bajo"}
        </span>
      </div>
    </div>
  );
}
