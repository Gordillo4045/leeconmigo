"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Attempt = {
  id: string;
  scorePercent: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  submittedAt: string | null;
  readingTimeSec: number | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export function StudentChartsInner({ attempts }: { attempts: Attempt[] }) {
  const chronological = [...attempts].reverse();

  const scoreData = chronological
    .filter((a) => a.scorePercent != null)
    .map((a) => ({
      label: formatDate(a.submittedAt),
      score: Math.round(a.scorePercent! * 10) / 10,
    }));

  const timeData = chronological
    .filter((a) => a.readingTimeSec != null)
    .map((a) => ({
      label: formatDate(a.submittedAt),
      segundos: a.readingTimeSec!,
    }));

  const totalCorrect = attempts.reduce((s, a) => s + (a.correctCount ?? 0), 0);
  const totalQuestions = attempts.reduce((s, a) => s + (a.totalQuestions ?? 0), 0);
  const accuracyPercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {scoreData.length >= 2 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Evolución de puntaje
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Puntaje"]} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {timeData.length >= 2 && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tiempo de lectura (seg)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v}s`, "Tiempo"]} />
                    <Bar dataKey="segundos" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {accuracyPercent != null && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Precisión acumulada
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className={`text-4xl font-bold ${
                  accuracyPercent >= 80 ? "text-success" :
                  accuracyPercent >= 60 ? "text-warning-foreground" : "text-destructive"
                }`}>
                  {accuracyPercent}%
                </span>
                <p className="text-xs text-muted-foreground text-center">
                  {totalCorrect} de {totalQuestions} respuestas correctas
                </p>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      accuracyPercent >= 80 ? "bg-success" :
                      accuracyPercent >= 60 ? "bg-warning" : "bg-destructive"
                    }`}
                    style={{ width: `${accuracyPercent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
