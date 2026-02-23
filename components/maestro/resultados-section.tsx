"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, FileText, TrendingUp } from "lucide-react";

type ScoreDistribution = {
  excellent: number;
  good: number;
  needsImprovement: number;
};

type CategoryAverages = {
  comprension: number | null;
  inferencia: number | null;
  vocabulario: number | null;
};

type TrendPoint = {
  week: string;
  avgScore: number;
  attempts: number;
};

type ResultadosData = {
  totalAttempts: number;
  avgScorePercent: number | null;
  avgReadingTimeSec: number | null;
  scoreDistribution: ScoreDistribution;
  categoryAverages: CategoryAverages;
  scoreTrend: TrendPoint[];
};

const DISTRIBUTION_COLORS = {
  excellent: "#22c55e",
  good: "#f59e0b",
  needsImprovement: "#ef4444",
};

const CATEGORY_COLOR = "#6366f1";

function formatWeek(week: string): string {
  // "2024-S03" -> "S03"
  const parts = week.split("-");
  return parts[parts.length - 1] ?? week;
}

function formatTime(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
};

function ScoreTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{p.value.toFixed(1)}%</span>
        </p>
      ))}
    </div>
  );
}

function CategoryTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Promedio: <span className="font-semibold text-foreground">{payload[0]?.value?.toFixed(1)}%</span>
      </p>
    </div>
  );
}

type PieTooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
};

function DistributionTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-muted-foreground">
        {item.value} alumno{item.value !== 1 ? "s" : ""} (
        {(item.payload.percent * 100).toFixed(0)}%)
      </p>
    </div>
  );
}

export function ResultadosSection({ apiUrl = "/api/maestro/resultados" }: { apiUrl?: string }) {
  const [data, setData] = useState<ResultadosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(apiUrl);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        if (!cancelled) setData(json as ResultadosData);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar resultados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Resultados de Evaluaciones</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-40 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 border-destructive/40 bg-destructive/10">
        <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>Aún no hay evaluaciones enviadas para mostrar resultados.</p>
        </CardContent>
      </Card>
    );
  }

  // Datos para gráfica de distribución (pie)
  const distributionData = [
    {
      name: "Excelente (≥80%)",
      value: data.scoreDistribution.excellent,
      color: DISTRIBUTION_COLORS.excellent,
    },
    {
      name: "Bien (60-79%)",
      value: data.scoreDistribution.good,
      color: DISTRIBUTION_COLORS.good,
    },
    {
      name: "Necesita mejora (<60%)",
      value: data.scoreDistribution.needsImprovement,
      color: DISTRIBUTION_COLORS.needsImprovement,
    },
  ].filter((d) => d.value > 0);

  // Datos para gráfica de categorías (bar)
  const categoryData = [
    {
      name: "Comprensión",
      promedio: data.categoryAverages.comprension,
    },
    {
      name: "Inferencia",
      promedio: data.categoryAverages.inferencia,
    },
    {
      name: "Vocabulario",
      promedio: data.categoryAverages.vocabulario,
    },
  ].filter((d) => d.promedio != null) as { name: string; promedio: number }[];

  // Datos para tendencia (line)
  const trendData = data.scoreTrend.map((t) => ({
    semana: formatWeek(t.week),
    "Puntaje promedio": t.avgScore,
    Intentos: t.attempts,
  }));

  const hasDistribution = distributionData.length > 0;
  const hasCategories = categoryData.length > 0;
  const hasTrend = trendData.length >= 2;

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Resultados de Evaluaciones</h2>
      </div>

      {/* Top metric cards */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Evaluaciones recibidas</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{data.totalAttempts}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total de intentos enviados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Puntaje general</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold text-foreground">
                {data.avgScorePercent != null ? data.avgScorePercent.toFixed(1) : "—"}
              </p>
              {data.avgScorePercent != null && (
                <span className="text-sm text-muted-foreground">%</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Promedio de todos los intentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tiempo de lectura</span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatTime(data.avgReadingTimeSec)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Promedio por evaluación</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribución de desempeño */}
        {hasDistribution && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Distribución de Desempeño</CardTitle>
              <CardDescription className="text-xs">
                Último intento por alumno clasificado por nivel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-full sm:w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DistributionTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  {distributionData.map((d) => {
                    const total = distributionData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="ml-auto font-semibold text-foreground">
                          {d.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promedio por categoría */}
        {hasCategories && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Promedio por Actividad</CardTitle>
              <CardDescription className="text-xs">
                Desempeño promedio en cada tipo de ejercicio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CategoryTooltip />} />
                    <Bar
                      dataKey="promedio"
                      name="Promedio"
                      fill={CATEGORY_COLOR}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Reference lines legend */}
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded" style={{ background: "#22c55e" }} />
                  ≥80% Excelente
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded" style={{ background: "#f59e0b" }} />
                  60-79% Bien
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded" style={{ background: "#ef4444" }} />
                  &lt;60% Mejora
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tendencia semanal */}
        {hasTrend && (
          <Card className={!hasDistribution || !hasCategories ? "" : "lg:col-span-2"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Tendencia de Puntajes</CardTitle>
              <CardDescription className="text-xs">
                Evolución del puntaje promedio del grupo por semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="semana"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<ScoreTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      formatter={(value) => (
                        <span className="text-muted-foreground">{value}</span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="Puntaje promedio"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nota si faltan datos */}
        {!hasCategories && !hasTrend && !hasDistribution && (
          <Card className="lg:col-span-2">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-40" />
              <p>Se necesitan más evaluaciones para mostrar gráficas detalladas.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
