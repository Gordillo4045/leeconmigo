import { EvaluationResult } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Brain, Lightbulb, Languages, ListOrdered, Star } from "lucide-react";

interface ResultadosStepProps {
  result: EvaluationResult;
  onFinish: () => void;
  /** Deshabilita el botón de enviar (evita doble envío). */
  isSubmitting?: boolean;
  /** Vista previa: botón habilitado con texto "Cerrar vista previa", no envía al servidor. */
  preview?: boolean;
}

const levelConfig = {
  excelente: { label: "¡Excelente!", emoji: "🌟", color: "bg-success text-success-foreground" },
  bueno: { label: "¡Muy bien!", emoji: "😊", color: "bg-step-lectura text-primary-foreground" },
  regular: { label: "¡Bien hecho!", emoji: "👍", color: "bg-warning text-warning-foreground" },
  necesita_mejora: { label: "¡Sigue practicando!", emoji: "💪", color: "bg-step-secuencias text-primary-foreground" },
};

const ResultadosStep = ({ result, onFinish, isSubmitting = false, preview = false }: ResultadosStepProps) => {
  const { scores } = result;
  const level = levelConfig[scores.overallLevel];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const stats = [
    {
      icon: Clock,
      label: "Tiempo de lectura",
      value: formatTime(scores.readingTimeSeconds),
      color: "text-step-lectura",
      bg: "bg-step-lectura/10",
    },
    {
      icon: Brain,
      label: "Comprensión",
      value: `${scores.comprehensionPercent}%`,
      percent: scores.comprehensionPercent,
      color: "text-step-comprension",
      bg: "bg-step-comprension/10",
      barColor: "bg-step-comprension",
    },
    {
      icon: Lightbulb,
      label: "Inferencia",
      value: `${scores.inferencePercent}%`,
      percent: scores.inferencePercent,
      color: "text-step-inferencia",
      bg: "bg-step-inferencia/10",
      barColor: "bg-step-inferencia",
    },
    {
      icon: Languages,
      label: "Vocabulario",
      value: `${scores.vocabularyPercent}%`,
      percent: scores.vocabularyPercent,
      color: "text-step-vocabulario",
      bg: "bg-step-vocabulario/10",
      barColor: "bg-step-vocabulario",
    },
    {
      icon: ListOrdered,
      label: "Secuencias",
      value: scores.sequenceCorrect ? "Correcto ✓" : "Incorrecto ✗",
      color: "text-step-secuencias",
      bg: "bg-step-secuencias/10",
    },
  ];

  return (
    <div className="space-y-6 animate-pop-in">
      {/* Hero result */}
      <Card className="overflow-hidden rounded-3xl border-0 shadow-card gradient-fun">
        <CardContent className="flex flex-col items-center py-10 text-center text-primary-foreground">
          <div className="mb-3 animate-bounce-soft">
            <Trophy className="h-16 w-16" />
          </div>
          <p className="text-5xl mb-2">{level.emoji}</p>
          <h2 className="font-display text-3xl font-black mb-2">{level.label}</h2>
          <Badge className={`${level.color} text-lg px-6 py-2 font-bold border-0`}>
            <Star className="h-4 w-4 mr-1" />
            Nivel: {scores.overallLevel.replace("_", " ")}
          </Badge>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="rounded-2xl border-2 border-muted shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <p className={`font-display text-2xl font-black ${stat.color}`}>{stat.value}</p>
                {stat.percent !== undefined && (
                  <Progress
                    value={stat.percent}
                    className={`mt-3 h-2 rounded-full [&>div]:${stat.barColor}`}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Finish button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          className="gap-2 rounded-2xl gradient-fun px-12 py-6 text-xl font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all disabled:opacity-60 disabled:pointer-events-none"
          onClick={onFinish}
          disabled={!preview && isSubmitting}
        >
          {preview ? "Cerrar vista previa" : isSubmitting ? "Enviando…" : "🎉 Finalizar evaluación"}
        </Button>
      </div>
    </div>
  );
};

export default ResultadosStep;
