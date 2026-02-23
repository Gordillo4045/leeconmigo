
"use client";

import React, { useEffect, useState } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  ArrowLeft,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  BarChart3,
} from "lucide-react";
import { StudentDetailModal, type MaestroDashboardStudent } from "../../components/maestro/student-detail-modal";
import { ResultadosSection } from "../../components/maestro/resultados-section";

type RiskLevel = "low" | "medium" | "high";

type DashboardStudent = {
  id: MaestroDashboardStudent["id"];
  name: MaestroDashboardStudent["name"];
  grade: MaestroDashboardStudent["grade"];
  latestScorePercent: MaestroDashboardStudent["latestScorePercent"];
  risk: MaestroDashboardStudent["risk"];
  trend: MaestroDashboardStudent["trend"];
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

export default function TeacherPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<DashboardStudent | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/maestro/dashboard");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setData(json as DashboardData);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "No se pudo cargar el dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
  const avgComprehension = data?.avgScorePercent ?? null;
  const students = data?.students ?? [];

  const sortedStudents = [...students].sort((a, b) => {
    const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.risk] - riskOrder[b.risk];
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard del Docente</h1>
              <p className="text-xs text-muted-foreground">
                Monitoreo real de progreso con datos de tus evaluaciones
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error ? (
          <Card className="mb-6 border-destructive/40 bg-destructive/10">
            <CardContent className="py-4 text-sm">
              <p className="font-medium text-destructive">No se pudo cargar el dashboard.</p>
              <p className="text-destructive/90">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total estudiantes"
            value={totalStudents.toString()}
            icon={<Users className="h-5 w-5" />}
            description={`${totalEvaluations} evaluaciones registradas`}
          />
          <SummaryCard
            title="Estudiantes en riesgo"
            value={studentsAtRisk.toString()}
            icon={<AlertTriangle className="h-5 w-5" />}
            description="Último intento con puntaje &lt; 60%"
            variant="warning"
          />
          <SummaryCard
            title="Puntaje promedio"
            value={avgComprehension != null ? avgComprehension.toFixed(1) : "—"}
            unit={avgComprehension != null ? "%" : undefined}
            icon={<Target className="h-5 w-5" />}
            description="Promedio general de comprensión"
          />
          <SummaryCard
            title="Con evaluaciones"
            value={students.filter((s) => s.latestScorePercent != null).length.toString()}
            icon={<BarChart3 className="h-5 w-5" />}
            description="Alumnos con al menos una evaluación enviada"
          />
        </div>

        {/* Resultados Section */}
        <ResultadosSection />

        {/* Alerts Section */}
        {studentsAtRisk > 0 && (
          <Card className="mb-8 border-warning/50 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-warning-foreground">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Atención
              </CardTitle>
              <CardDescription>
                Los siguientes estudiantes presentan indicadores de posibles dificultades de lectura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedStudents
                  .filter((s) => s.risk === "high")
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className="flex w-full items-center justify-between rounded-lg border border-destructive/30 bg-card p-3 text-left transition-colors hover:bg-destructive/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-sm font-bold text-destructive">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.grade ? `${s.grade}° grado · ` : ""}Último puntaje:{" "}
                            {s.latestScorePercent != null ? `${s.latestScorePercent.toFixed(1)}%` : "—"}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive">
                        Alto riesgo
                      </span>
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Progreso de Estudiantes
                </CardTitle>
                <CardDescription>Vista general del desempeño de cada estudiante</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header Row */}
              <div className="hidden grid-cols-12 gap-4 border-b pb-3 text-xs font-medium text-muted-foreground md:grid">
                <div className="col-span-3">Estudiante</div>
                <div className="col-span-3">Último puntaje</div>
                <div className="col-span-2">Tendencia</div>
                <div className="col-span-1">Estado</div>
              </div>

              {/* Student Rows */}
              {sortedStudents.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  onClick={() => setSelectedStudent(s)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
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

function StudentRow({
  student,
  onClick,
}: {
  student: DashboardStudent;
  onClick: () => void;
}) {
  const TrendIcon =
    student.trend === "improving" ? TrendingUp : student.trend === "declining" ? TrendingDown : Minus;
  const trendColor =
    student.trend === "improving"
      ? "text-success"
      : student.trend === "declining"
      ? "text-destructive"
      : "text-muted-foreground";

  const riskBadge = getRiskBadgeClass(student.risk);
  const hasEval = student.latestScorePercent != null;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 md:grid md:grid-cols-12 md:items-center md:gap-4 md:p-3"
    >
      {/* Student Info */}
      <div className="col-span-3 mb-3 flex items-center gap-3 md:mb-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
            student.risk === "high"
              ? "bg-destructive/10 text-destructive"
              : student.risk === "medium"
              ? "bg-warning/10 text-warning-foreground"
              : "bg-success/10 text-success"
          }`}
        >
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-foreground">{student.name}</p>
          <p className="text-xs text-muted-foreground">
            {student.grade ? `${student.grade}° grado` : "Sin grado asignado"}
          </p>
        </div>
      </div>

      {/* Mobile: Metrics */}
      <div className="mb-3 grid grid-cols-3 gap-4 md:hidden">
        <div>
          <p className="text-xs text-muted-foreground">Último puntaje</p>
          <p className="font-semibold text-foreground">
            {hasEval ? `${student.latestScorePercent!.toFixed(1)}%` : "Sin evaluaciones"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tendencia</p>
          <p className={`font-semibold ${trendColor}`}>
            {student.trend === "improving"
              ? "Mejorando"
              : student.trend === "declining"
              ? "Bajando"
              : "Estable"}
          </p>
        </div>
      </div>

      {/* Desktop: Último puntaje */}
      <div className="col-span-3 hidden md:block">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {hasEval ? `${student.latestScorePercent!.toFixed(1)}%` : "Sin evaluaciones"}
          </span>
        </div>
        {hasEval ? (
          <Progress value={student.latestScorePercent!} className="mt-1 h-1.5" />
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Sin datos aún</p>
        )}
      </div>

      {/* Trend */}
      <div className="col-span-2 hidden items-center gap-1 md:flex">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className={`text-sm ${trendColor}`}>
          {student.trend === "improving"
            ? "Mejorando"
            : student.trend === "declining"
            ? "Bajando"
            : "Estable"}
        </span>
      </div>

      {/* Status Badge */}
      <div className="col-span-1 flex items-center justify-between md:justify-end">
        <div className="flex items-center gap-1 md:hidden">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={`text-xs ${trendColor}`}>
            {student.trend === "improving"
              ? "Mejorando"
              : student.trend === "declining"
              ? "Bajando"
              : "Estable"}
          </span>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium border ${riskBadge}`}>
          {student.risk === "high" ? "Alto" : student.risk === "medium" ? "Medio" : "Bajo"}
        </span>
      </div>
    </button>
  );
}
