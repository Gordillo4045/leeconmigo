// ============================================
// Tipos TypeScript para Evaluación Lectora
// Interfaces vacías listas para conectar a backend
// ============================================

export interface ReadingText {
  id: string;
  title: string;
  content: string;
  gradeLevel: number;
  wordCount: number;
  estimatedReadingTime: number; // in seconds
  createdAt?: string;
  updatedAt?: string;
}

export interface ComprehensionQuestion {
  id: string;
  textId: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  order: number;
}

export interface InferenceStatement {
  id: string;
  textId: string;
  statement: string;
  contextFragment: string;
  correctAnswer: "verdadero" | "falso" | "indeterminado";
  order: number;
}

export interface VocabularyPair {
  id: string;
  textId: string;
  word: string;
  definition: string;
  order: number;
}

export interface SequenceItem {
  id: string;
  textId: string;
  text: string;
  correctOrder: number;
}

export interface StudentAnswer {
  questionId: string;
  selectedAnswer: string | number;
  timeSpent: number; // seconds
  correct?: boolean;
}

export interface VocabularyMatch {
  wordId: string;
  selectedDefinitionId: string;
  correct?: boolean;
}

export interface EvaluationSession {
  id: string;
  studentId: string;
  textId: string;
  startedAt: string;
  completedAt?: string;
  status: "in_progress" | "completed" | "abandoned";
}

export interface ReadingResult {
  readingTime: number;
  startedAt: string;
  finishedAt: string;
}

export interface EvaluationResult {
  sessionId: string;
  reading: ReadingResult;
  comprehension: StudentAnswer[];
  inference: StudentAnswer[];
  vocabulary: VocabularyMatch[];
  sequenceOrder: string[];
  sequenceCorrect: boolean;
  scores: {
    comprehensionPercent: number;
    inferencePercent: number;
    vocabularyPercent: number;
    sequenceCorrect: boolean;
    readingTimeSeconds: number;
    overallLevel: "excelente" | "bueno" | "regular" | "necesita_mejora";
  };
}

export interface EvaluationConfig {
  id: string;
  text: ReadingText;
  comprehensionQuestions: ComprehensionQuestion[];
  inferenceStatements: InferenceStatement[];
  vocabularyPairs: VocabularyPair[];
  sequenceItems: SequenceItem[];
  isPublished: boolean;
  createdAt?: string;
}

// Wizard state
export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export const STEP_LABELS = [
  "Lectura",
  "Comprensión",
  "Inferencia",
  "Vocabulario",
  "Secuencias",
  "Resultados",
] as const;

export const STEP_COLORS = [
  "step-lectura",
  "step-comprension",
  "step-inferencia",
  "step-vocabulario",
  "step-secuencias",
  "step-resultados",
] as const;

export const STEP_ICONS = [
  "BookOpen",
  "Brain",
  "Lightbulb",
  "Languages",
  "ListOrdered",
  "Trophy",
] as const;

// Props interfaces
export interface StepProps {
  onNext: () => void;
  onPrev: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export interface LecturaGuiadaProps extends StepProps {
  text: ReadingText;
  onReadingComplete: (result: ReadingResult) => void;
}

export interface ComprensionProps extends StepProps {
  questions: ComprehensionQuestion[];
  onAnswersSubmit: (answers: StudentAnswer[]) => void;
}

export interface InferenciaProps extends StepProps {
  statements: InferenceStatement[];
  onAnswersSubmit: (answers: StudentAnswer[]) => void;
}

export interface VocabularioProps extends StepProps {
  pairs: VocabularyPair[];
  onMatchesSubmit: (matches: VocabularyMatch[]) => void;
}

export interface SecuenciasProps extends StepProps {
  items: SequenceItem[];
  onOrderSubmit: (orderedIds: string[]) => void;
}

export interface ResultadosProps extends StepProps {
  result: EvaluationResult;
  onFinish: () => void;
}
