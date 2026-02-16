import { useState, useCallback } from "react";
import { BookOpen, Brain, Lightbulb, Languages, ListOrdered, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  WizardStep,
  STEP_LABELS,
  ReadingResult,
  StudentAnswer,
  VocabularyMatch,
  EvaluationResult,
  ReadingText,
  ComprehensionQuestion,
  InferenceStatement,
  VocabularyPair,
  SequenceItem,
} from "./types";
import {
  mockText,
  mockComprehensionQuestions,
  mockInferenceStatements,
  mockVocabularyPairs,
  mockSequenceItems,
} from "./mock-data";
import LecturaGuiadaStep from "./steps/lectura-guiada";
import ComprensionStep from "./steps/comprension";
import InferenciaStep from "./steps/inferencia";
import VocabularioStep from "./steps/vocabulario";
import SecuenciasStep from "./steps/secuencias";
import ResultadosStep from "./steps/resultados";

const STEP_ICONS_COMPONENTS = [BookOpen, Brain, Lightbulb, Languages, ListOrdered, Trophy];

const stepColors = [
  "bg-step-lectura",
  "bg-step-comprension",
  "bg-step-inferencia",
  "bg-step-vocabulario",
  "bg-step-secuencias",
  "bg-step-resultados",
];

export type EvaluationWizardData = {
  text: ReadingText;
  comprehensionQuestions: ComprehensionQuestion[];
  inferenceStatements: InferenceStatement[];
  vocabularyPairs: VocabularyPair[];
  sequenceItems: SequenceItem[];
};

export type EvaluationWizardProps = {
  data?: EvaluationWizardData;
  onSubmit?: (result: EvaluationResult) => void | Promise<void>;
  /** Cuando es true, el botón "Finalizar evaluación" se deshabilita (evita doble envío). */
  isSubmitting?: boolean;
  /** Vista previa (maestro/config): el botón de enviar se muestra habilitado como "Cerrar vista previa" y no envía al servidor. */
  preview?: boolean;
};

const EvaluationWizard = ({ data, onSubmit, isSubmitting = false, preview = false }: EvaluationWizardProps) => {
  const text = data?.text ?? mockText;
  const comprehensionQuestions = data?.comprehensionQuestions ?? mockComprehensionQuestions;
  const inferenceStatements = data?.inferenceStatements ?? mockInferenceStatements;
  const vocabularyPairs = data?.vocabularyPairs ?? mockVocabularyPairs;
  const sequenceItems = data?.sequenceItems ?? mockSequenceItems;

  const hasInference = inferenceStatements.length > 0;
  const hasVocab = vocabularyPairs.length > 0;
  const hasSequence = sequenceItems.length > 0;

  const stepIndices: WizardStep[] = [0];
  if (comprehensionQuestions.length > 0) stepIndices.push(1);
  if (hasInference) stepIndices.push(2);
  if (hasVocab) stepIndices.push(3);
  if (hasSequence) stepIndices.push(4);
  stepIndices.push(5);
  const stepCount = stepIndices.length;
  const maxStepIndex = stepCount - 1;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = stepIndices[currentStepIndex] ?? 0;

  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);
  const [comprehensionAnswers, setComprehensionAnswers] = useState<StudentAnswer[]>([]);
  const [inferenceAnswers, setInferenceAnswers] = useState<StudentAnswer[]>([]);
  const [vocabularyMatches, setVocabularyMatches] = useState<VocabularyMatch[]>([]);
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);

  const goNext = useCallback(() => setCurrentStepIndex((i) => Math.min(i + 1, maxStepIndex)), [maxStepIndex]);
  const goPrev = useCallback(() => setCurrentStepIndex((i) => Math.max(i - 1, 0)), []);

  const globalProgress = stepCount > 0 ? ((currentStepIndex + 1) / stepCount) * 100 : 0;

  const buildResult = (): EvaluationResult => {
    const compCorrect = comprehensionAnswers.filter((a) => a.correct).length;
    const infCorrect = inferenceAnswers.filter((a) => a.correct).length;
    const vocCorrect = vocabularyMatches.filter((m) => m.correct).length;
    const seqCorrect = sequenceItems.length > 0 && sequenceOrder.length > 0 && sequenceItems.every(
      (item, i) => sequenceOrder[i] === sequenceItems.find((s) => s.correctOrder === i + 1)?.id
    );

    const compPercent = comprehensionQuestions.length ? Math.round((compCorrect / comprehensionQuestions.length) * 100) : 0;
    const infPercent = inferenceStatements.length ? Math.round((infCorrect / inferenceStatements.length) * 100) : 0;
    const vocPercent = vocabularyPairs.length ? Math.round((vocCorrect / vocabularyPairs.length) * 100) : 0;

    const parts = [compPercent, infPercent, vocPercent, seqCorrect ? 100 : 0].filter((_, i) =>
      (i === 0 && comprehensionQuestions.length > 0) || (i === 1 && inferenceStatements.length > 0) || (i === 2 && vocabularyPairs.length > 0) || (i === 3 && sequenceItems.length > 0)
    );
    const avg = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
    const overallLevel = avg >= 90 ? "excelente" : avg >= 70 ? "bueno" : avg >= 50 ? "regular" : "necesita_mejora";

    return {
      sessionId: "session-placeholder",
      reading: readingResult || { readingTime: 0, startedAt: "", finishedAt: "" },
      comprehension: comprehensionAnswers,
      inference: inferenceAnswers,
      vocabulary: vocabularyMatches,
      sequenceOrder,
      sequenceCorrect: seqCorrect,
      scores: {
        comprehensionPercent: compPercent,
        inferencePercent: infPercent,
        vocabularyPercent: vocPercent,
        sequenceCorrect: seqCorrect,
        readingTimeSeconds: readingResult?.readingTime || 0,
        overallLevel,
      },
    };
  };

  const handleFinish = () => {
    const result = buildResult();
    if (onSubmit) {
      void Promise.resolve(onSubmit(result));
    } else {
      console.log("Evaluation result:", result);
      alert("¡Evaluación completada! Los resultados serán enviados al servidor.");
    }
  };

  return (
    <div className="min-h-screen gradient-sky">
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-black text-foreground md:text-4xl">
            📚 Evaluación de Lectura
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{text.title}</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {stepIndices.map((stepKey, i) => {
              const label = STEP_LABELS[stepKey];
              const Icon = STEP_ICONS_COMPONENTS[stepKey];
              const isActive = i === currentStepIndex;
              const isDone = i < currentStepIndex;
              return (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 md:h-12 md:w-12 ${isActive
                        ? `${stepColors[stepKey]} text-primary-foreground shadow-button scale-110`
                        : isDone
                          ? `${stepColors[stepKey]}/80 text-primary-foreground`
                          : "bg-muted text-muted-foreground"
                      }`}
                  >
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <span
                    className={`hidden text-xs font-bold md:block ${isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={globalProgress} className="h-2 rounded-full" />
        </div>

        {/* Step content */}
        <div className="min-h-[500px]">
          {currentStep === 0 && (
            <LecturaGuiadaStep
              text={text}
              onReadingComplete={setReadingResult}
              onNext={goNext}
              onPrev={goPrev}
              isFirst
            />
          )}
          {currentStep === 1 && (
            <ComprensionStep
              questions={comprehensionQuestions}
              onAnswersSubmit={setComprehensionAnswers}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}
          {currentStep === 2 && hasInference && (
            <InferenciaStep
              statements={inferenceStatements}
              onAnswersSubmit={setInferenceAnswers}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}
          {currentStep === 3 && hasVocab && (
            <VocabularioStep
              pairs={vocabularyPairs}
              onMatchesSubmit={setVocabularyMatches}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}
          {currentStep === 4 && hasSequence && (
            <SecuenciasStep
              items={sequenceItems}
              onOrderSubmit={setSequenceOrder}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}
          {currentStep === 5 && (
            <ResultadosStep
              result={buildResult()}
              onFinish={handleFinish}
              isSubmitting={isSubmitting}
              preview={preview}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationWizard;
