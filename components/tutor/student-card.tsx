"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { StudentCharts } from "./student-charts";

type RiskLevel = "low" | "medium" | "high";

type Attempt = {
  id: string;
  scorePercent: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  submittedAt: string | null;
  readingTimeSec: number | null;
};

type StudentCardProps = {
  id: string;
  name: string;
  latestScorePercent: number | null;
  risk: RiskLevel;
  trend: "improving" | "stable" | "declining" | null;
  attempts: Attempt[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function StudentCard({ id: _id, name, latestScorePercent, risk, trend, attempts }: StudentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const TrendIcon =
    trend === "improving" ? TrendingUp :
    trend === "declining" ? TrendingDown : Minus;

  const trendColor =
    trend === "improving" ? "text-success" :
    trend === "declining" ? "text-destructive" : "text-muted-foreground";

  const trendLabel =
    trend === "improving" ? "Mejorando" :
    trend === "declining" ? "Bajando" : "Estable";

  const riskBadgeClass =
    risk === "high" ? "bg-destructive/10 text-destructive border-destructive/40" :
    risk === "medium" ? "bg-warning/10 text-warning-foreground border-warning/40" :
    "bg-success/10 text-success border-success/40";

  const avatarClass =
    risk === "high" ? "bg-destructive/10 text-destructive" :
    risk === "medium" ? "bg-warning/10 text-warning-foreground" :
    "bg-success/10 text-success";

  const hasEval = latestScorePercent != null;
  const hasHistory = attempts.length > 0;

  return (
    <Card
      className={hasHistory ? `cursor-pointer select-none transition-colors ${!expanded ? "hover:bg-accent/30" : ""}` : ""}
      onClick={hasHistory ? () => setExpanded((v) => !v) : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarClass}`}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                <span className={`text-xs ${trendColor}`}>{trendLabel}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-2 py-1 text-xs font-medium ${riskBadgeClass}`}>
              {risk === "high" ? "Alto riesgo" : risk === "medium" ? "Medio" : "Bajo riesgo"}
            </span>
            {hasHistory && (
              <span className="text-muted-foreground">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasEval ? (
          <div className="mb-1">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Último puntaje</span>
              <span className="font-semibold text-foreground">{latestScorePercent!.toFixed(1)}%</span>
            </div>
            <Progress value={latestScorePercent!} className="h-2" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin evaluaciones aún</p>
        )}

        {expanded && (
          <>
            {/* Attempt history table */}
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Historial de intentos
              </p>
              <div className="space-y-2">
                {attempts.map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      <span className="text-sm text-foreground">{formatDate(a.submittedAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.correctCount != null && a.totalQuestions != null && (
                        <span className="text-xs text-muted-foreground">
                          {a.correctCount}/{a.totalQuestions} correctas
                        </span>
                      )}
                      {a.readingTimeSec != null && (
                        <span className="text-xs text-muted-foreground">{a.readingTimeSec}s</span>
                      )}
                      <span className={`text-sm font-semibold ${
                        a.scorePercent == null ? "text-muted-foreground" :
                        a.scorePercent >= 80 ? "text-success" :
                        a.scorePercent >= 60 ? "text-warning-foreground" : "text-destructive"
                      }`}>
                        {a.scorePercent != null ? `${a.scorePercent.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <StudentCharts attempts={attempts} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
