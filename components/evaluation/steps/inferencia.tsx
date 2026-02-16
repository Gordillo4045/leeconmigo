import { useState, useRef, useEffect } from "react";
import { InferenciaProps, StudentAnswer } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Check, X, HelpCircle, ChevronRight } from "lucide-react";

const InferenciaStep = ({ statements, onAnswersSubmit, onNext, onPrev }: InferenciaProps) => {
  const [currentS, setCurrentS] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    setSelected(null);
  }, [currentS]);

  const statement = statements[currentS];
  const progress = ((currentS + 1) / statements.length) * 100;

  const handleSelect = (answer: string) => {
    setSelected(answer);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const timeSpent = (Date.now() - startTime.current) / 1000;
    const answer: StudentAnswer = {
      questionId: statement.id,
      selectedAnswer: selected,
      timeSpent,
      correct: selected === statement.correctAnswer,
    };
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentS < statements.length - 1) {
      setCurrentS(currentS + 1);
    } else {
      onAnswersSubmit(newAnswers);
      onNext();
    }
  };

  const options = [
    { value: "verdadero", label: "Verdadero", icon: Check, color: "border-success/30 hover:border-success hover:bg-success/5", selectedColor: "border-success bg-success/10 ring-2 ring-success/30" },
    { value: "falso", label: "Falso", icon: X, color: "border-destructive/30 hover:border-destructive hover:bg-destructive/5", selectedColor: "border-destructive bg-destructive/10 ring-2 ring-destructive/30" },
    { value: "indeterminado", label: "No se puede saber", icon: HelpCircle, color: "border-warning/30 hover:border-warning hover:bg-warning/5", selectedColor: "border-warning bg-warning/10 ring-2 ring-warning/30" },
  ];

  return (
    <div className="space-y-6 animate-pop-in">
      <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-step-inferencia/10">
            <Lightbulb className="h-6 w-6 text-step-inferencia" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Inferencia</p>
            <p className="font-display text-lg font-bold text-foreground">
              Afirmación {currentS + 1} de {statements.length}
            </p>
          </div>
        </div>
        <Badge className="bg-step-inferencia/10 text-step-inferencia border-0 text-base px-4 py-2">
          {answers.length}/{statements.length}
        </Badge>
      </div>

      <Progress value={progress} className="h-3 rounded-full [&>div]:bg-step-inferencia" />

      {/* Context fragment */}
      <Card className="rounded-2xl border border-muted bg-muted/30">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground mb-2">📖 Fragmento del texto:</p>
          <p className="text-base italic text-foreground leading-relaxed">"{statement.contextFragment}"</p>
        </CardContent>
      </Card>

      {/* Statement */}
      <Card className="rounded-3xl border-2 border-step-inferencia/20 shadow-card">
        <CardContent className="p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-foreground md:text-2xl mb-6">
            {statement.statement}
          </h3>
          <p className="text-base text-muted-foreground mb-6">¿Esta afirmación es verdadera, falsa o no se puede determinar?</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all duration-200 ${
                    selected === opt.value ? opt.selectedColor : opt.color
                  }`}
                >
                  <Icon className="h-10 w-10" />
                  <span className="font-display text-lg font-bold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" className="rounded-xl px-6 py-5 text-base" onClick={onPrev}>
          ← Anterior
        </Button>
        <Button
          size="lg"
          disabled={!selected}
          className="gap-2 rounded-xl bg-step-inferencia px-8 py-5 text-base font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all disabled:opacity-40"
          onClick={handleConfirm}
        >
          {currentS < statements.length - 1 ? "Siguiente" : "Continuar"}
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default InferenciaStep;
