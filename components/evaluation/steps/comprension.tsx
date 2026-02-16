import { useState, useRef, useEffect } from "react";
import { ComprensionProps, StudentAnswer } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, ChevronRight } from "lucide-react";

const ComprensionStep = ({ questions, onAnswersSubmit, onNext, onPrev }: ComprensionProps) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    setSelected(null);
  }, [currentQ]);

  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;

  const handleSelect = (index: number) => {
    setSelected(index);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    const timeSpent = (Date.now() - startTime.current) / 1000;
    const answer: StudentAnswer = {
      questionId: question.id,
      selectedAnswer: selected,
      timeSpent,
      correct: selected === question.correctAnswerIndex,
    };
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      onAnswersSubmit(newAnswers);
      onNext();
    }
  };

  const optionColors = [
    "border-step-lectura/30 hover:border-step-lectura hover:bg-step-lectura/5",
    "border-step-comprension/30 hover:border-step-comprension hover:bg-step-comprension/5",
    "border-step-inferencia/30 hover:border-step-inferencia hover:bg-step-inferencia/5",
    "border-step-vocabulario/30 hover:border-step-vocabulario hover:bg-step-vocabulario/5",
  ];

  const selectedColors = [
    "border-step-lectura bg-step-lectura/10 ring-2 ring-step-lectura/30",
    "border-step-comprension bg-step-comprension/10 ring-2 ring-step-comprension/30",
    "border-step-inferencia bg-step-inferencia/10 ring-2 ring-step-inferencia/30",
    "border-step-vocabulario bg-step-vocabulario/10 ring-2 ring-step-vocabulario/30",
  ];

  return (
    <div className="space-y-6 animate-pop-in">
      {/* Progress header */}
      <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-step-comprension/10">
            <Brain className="h-6 w-6 text-step-comprension" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Comprensión lectora</p>
            <p className="font-display text-lg font-bold text-foreground">
              Pregunta {currentQ + 1} de {questions.length}
            </p>
          </div>
        </div>
        <Badge className="bg-step-comprension/10 text-step-comprension border-0 text-base px-4 py-2">
          {answers.length}/{questions.length}
        </Badge>
      </div>

      <Progress value={progress} className="h-3 rounded-full [&>div]:bg-step-comprension" />

      {/* Question card */}
      <Card className="rounded-3xl border-2 border-step-comprension/20 shadow-card">
        <CardContent className="p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-foreground md:text-2xl mb-6">
            {question.question}
          </h3>

          <div className="grid gap-3 md:gap-4">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full rounded-2xl border-2 p-4 text-left text-lg font-medium transition-all duration-200 md:p-5 md:text-xl ${
                  selected === i
                    ? selectedColors[i % 4]
                    : optionColors[i % 4]
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-display font-bold text-sm">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl px-6 py-5 text-base"
          onClick={onPrev}
        >
          ← Anterior
        </Button>
        <Button
          size="lg"
          disabled={selected === null}
          className="gap-2 rounded-xl bg-step-comprension px-8 py-5 text-base font-bold text-primary-foreground shadow-button hover:opacity-90 transition-all disabled:opacity-40"
          onClick={handleConfirm}
        >
          {currentQ < questions.length - 1 ? "Siguiente pregunta" : "Continuar"}
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ComprensionStep;
