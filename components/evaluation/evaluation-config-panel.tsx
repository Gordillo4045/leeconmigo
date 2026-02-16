import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mockText,
  mockComprehensionQuestions,
  mockInferenceStatements,
  mockVocabularyPairs,
  mockSequenceItems,
} from "./mock-data";
import type { ReadingText, ComprehensionQuestion, InferenceStatement, VocabularyPair, SequenceItem } from "./types";
import { BookOpen, Brain, Lightbulb, Languages, ListOrdered, Send, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import type { EvaluationWizardData } from "./evaluation-wizard";

const EvaluationWizard = dynamic(
  () => import("./evaluation-wizard").then((m) => m.default),
  { ssr: false }
);

export type EvaluationConfigPanelData = {
  quizId?: string | null;
  text: ReadingText;
  comprehensionQuestions: ComprehensionQuestion[];
  inferenceStatements: InferenceStatement[];
  vocabularyPairs: VocabularyPair[];
  sequenceItems: SequenceItem[];
};

type Classroom = { id: string; name: string; grade_id: number };

type EvaluationConfigPanelProps = {
  initialData?: EvaluationConfigPanelData;
  textId?: string;
  onRefresh?: () => void | Promise<void>;
};

const EvaluationConfigPanel = ({ initialData, textId, onRefresh }: EvaluationConfigPanelProps) => {
  const [publishOpen, setPublishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [expires, setExpires] = useState(60);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ session_id: string; codes: Array<{ code: string; attempt_id: string; student_id?: string; student_name?: string }> } | null>(null);
  const [publishErr, setPublishErr] = useState<string | null>(null);

  // Diálogos agregar ejercicios
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionOptions, setQuestionOptions] = useState(["", "", "", ""]);
  const [questionAnswerIndex, setQuestionAnswerIndex] = useState(0);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionErr, setQuestionErr] = useState<string | null>(null);

  const [inferenceOpen, setInferenceOpen] = useState(false);
  const [inferenceStatement, setInferenceStatement] = useState("");
  const [inferenceContext, setInferenceContext] = useState("");
  const [inferenceCorrect, setInferenceCorrect] = useState<"verdadero" | "falso" | "indeterminado">("verdadero");
  const [inferenceSubmitting, setInferenceSubmitting] = useState(false);
  const [inferenceErr, setInferenceErr] = useState<string | null>(null);

  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyWord, setVocabularyWord] = useState("");
  const [vocabularyDefinition, setVocabularyDefinition] = useState("");
  const [vocabularySubmitting, setVocabularySubmitting] = useState(false);
  const [vocabularyErr, setVocabularyErr] = useState<string | null>(null);

  const [sequenceOpen, setSequenceOpen] = useState(false);
  const [sequenceText, setSequenceText] = useState("");
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [sequenceSubmitting, setSequenceSubmitting] = useState(false);
  const [sequenceErr, setSequenceErr] = useState<string | null>(null);

  const text = initialData?.text ?? mockText;
  const comprehensionQuestions = initialData?.comprehensionQuestions ?? mockComprehensionQuestions;
  const inferenceStatements = initialData?.inferenceStatements ?? mockInferenceStatements;
  const vocabularyPairs = initialData?.vocabularyPairs ?? mockVocabularyPairs;
  const sequenceItems = initialData?.sequenceItems ?? mockSequenceItems;
  const quizId = initialData?.quizId ?? null;

  const canPublish = !!textId && !!quizId && text.gradeLevel >= 1 && text.gradeLevel <= 3;

  const loadClassrooms = async () => {
    try {
      const res = await fetch("/api/classrooms");
      const json = await res.json().catch(() => ({}));
      setClassrooms(json.classrooms ?? []);
    } catch {
      setClassrooms([]);
    }
  };

  const openPublish = () => {
    setPublishOpen(true);
    setPublishResult(null);
    setPublishErr(null);
    setClassroomId("");
    setExpires(60);
    loadClassrooms();
  };

  const handlePublish = async () => {
    if (!textId || !quizId || !classroomId) return;
    setPublishing(true);
    setPublishErr(null);
    try {
      const res = await fetch("/api/publish-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroom_id: classroomId,
          text_id: textId,
          quiz_id: quizId,
          expires_in_minutes: expires,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al publicar");
      setPublishResult(json.result ?? null);
    } catch (e: unknown) {
      setPublishResult(null);
      setPublishErr(e instanceof Error ? e.message : "Error al publicar evaluación");
    } finally {
      setPublishing(false);
    }
  };

  const publishClassrooms = classrooms.filter((c) => c.grade_id === text.gradeLevel);

  const openQuestionDialog = () => {
    setQuestionPrompt("");
    setQuestionOptions(["", "", "", ""]);
    setQuestionAnswerIndex(0);
    setQuestionErr(null);
    setQuestionOpen(true);
  };

  const handleAddQuestion = async () => {
    if (!textId || !questionPrompt.trim() || questionOptions.some((o) => !o.trim())) return;
    setQuestionSubmitting(true);
    setQuestionErr(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(textId)}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: questionPrompt.trim(),
          options: questionOptions.map((o) => o.trim()) as [string, string, string, string],
          answer_index: questionAnswerIndex,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al agregar");
      await onRefresh?.();
      setQuestionOpen(false);
    } catch (e: unknown) {
      setQuestionErr(e instanceof Error ? e.message : "Error al agregar pregunta");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const openInferenceDialog = () => {
    setInferenceStatement("");
    setInferenceContext("");
    setInferenceCorrect("verdadero");
    setInferenceErr(null);
    setInferenceOpen(true);
  };

  const handleAddInference = async () => {
    if (!textId || !inferenceStatement.trim()) return;
    setInferenceSubmitting(true);
    setInferenceErr(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(textId)}/inference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: inferenceStatement.trim(),
          context_fragment: inferenceContext.trim() || undefined,
          correct_answer: inferenceCorrect,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al agregar");
      await onRefresh?.();
      setInferenceOpen(false);
    } catch (e: unknown) {
      setInferenceErr(e instanceof Error ? e.message : "Error al agregar afirmación");
    } finally {
      setInferenceSubmitting(false);
    }
  };

  const openVocabularyDialog = () => {
    setVocabularyWord("");
    setVocabularyDefinition("");
    setVocabularyErr(null);
    setVocabularyOpen(true);
  };

  const handleAddVocabulary = async () => {
    if (!textId || !vocabularyWord.trim() || !vocabularyDefinition.trim()) return;
    setVocabularySubmitting(true);
    setVocabularyErr(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(textId)}/vocabulary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: vocabularyWord.trim(), definition: vocabularyDefinition.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al agregar");
      await onRefresh?.();
      setVocabularyOpen(false);
    } catch (e: unknown) {
      setVocabularyErr(e instanceof Error ? e.message : "Error al agregar par");
    } finally {
      setVocabularySubmitting(false);
    }
  };

  const openSequenceDialog = () => {
    setSequenceText("");
    setSequenceOrder((initialData?.sequenceItems?.length ?? 0) + 1);
    setSequenceErr(null);
    setSequenceOpen(true);
  };

  const handleAddSequence = async () => {
    if (!textId || !sequenceText.trim() || sequenceOrder < 1) return;
    setSequenceSubmitting(true);
    setSequenceErr(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(textId)}/sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sequenceText.trim(), correct_order: sequenceOrder }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al agregar");
      await onRefresh?.();
      setSequenceOpen(false);
    } catch (e: unknown) {
      setSequenceErr(e instanceof Error ? e.message : "Error al agregar evento");
    } finally {
      setSequenceSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Configurar Evaluación
            </h1>
            <p className="text-sm text-muted-foreground">
              Edita el contenido de cada actividad antes de publicar
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button
              className="gap-2 bg-primary"
              disabled={!canPublish}
              onClick={openPublish}
              title={!canPublish ? "Esta plantilla necesita quiz y grado válido para publicar" : undefined}
            >
              <Send className="h-4 w-4" /> Publicar
            </Button>
          </div>
        </div>

        {/* Dialog Preview: mismo flujo que verá el alumno */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[95vh] p-0 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 pb-2 border-b bg-muted/30">
              <DialogTitle>Vista previa — como la verá el alumno</DialogTitle>
              <DialogDescription>{text.title}. Recorre los pasos igual que en la evaluación real.</DialogDescription>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <EvaluationWizard
                data={
                  {
                    text,
                    comprehensionQuestions,
                    inferenceStatements,
                    vocabularyPairs,
                    sequenceItems,
                  } satisfies EvaluationWizardData
                }
                onSubmit={() => setPreviewOpen(false)}
                isSubmitting={false}
                preview
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Publicar */}
        <Dialog open={publishOpen} onOpenChange={(open) => { setPublishOpen(open); if (!open) { setPublishResult(null); setPublishErr(null); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Publicar evaluación</DialogTitle>
              <DialogDescription>
                Elige el salón y el tiempo de vigencia. Los alumnos accederán con un código.
              </DialogDescription>
            </DialogHeader>
            {publishErr && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {publishErr}
              </div>
            )}
            {!publishResult ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Salón ({text.gradeLevel}°)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={classroomId}
                    onChange={(e) => setClassroomId(e.target.value)}
                  >
                    <option value="">Selecciona un salón</option>
                    {publishClassrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Expiración (minutos)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={240}
                    value={expires}
                    onChange={(e) => setExpires(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <p className="font-medium text-success">Evaluación publicada</p>
                {publishResult.codes?.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Códigos:</p>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {publishResult.codes.map((c) => (
                        <a
                          key={c.attempt_id}
                          href={`/a/${encodeURIComponent(c.code)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border p-2 text-center text-primary hover:underline"
                        >
                          <span className="block text-sm font-medium text-foreground truncate">{c.student_name ?? c.student_id ?? "—"}</span>
                          <span className="font-mono text-xs">{c.code}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay alumnos en el salón seleccionado.</p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPublishOpen(false)}>Cerrar</Button>
              {!publishResult && (
                <Button onClick={handlePublish} disabled={!classroomId || publishing}>
                  {publishing ? "Publicando…" : "Publicar"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Agregar pregunta */}
        <Dialog open={questionOpen} onOpenChange={(open) => { setQuestionOpen(open); if (!open) setQuestionErr(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar pregunta de comprensión</DialogTitle>
              <DialogDescription>Escribe la pregunta y las 4 opciones. Elige la respuesta correcta.</DialogDescription>
            </DialogHeader>
            {questionErr && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{questionErr}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pregunta</Label>
                <Textarea value={questionPrompt} onChange={(e) => setQuestionPrompt(e.target.value)} rows={2} placeholder="¿Qué pasó con...?" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Label>Opción {i + 1}{questionAnswerIndex === i ? " (correcta)" : ""}</Label>
                  <Input
                    value={questionOptions[i] ?? ""}
                    onChange={(e) => {
                      const next = [...questionOptions];
                      next[i] = e.target.value;
                      setQuestionOptions(next);
                    }}
                    placeholder={`Opción ${i + 1}`}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Respuesta correcta</Label>
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="answer_index"
                        checked={questionAnswerIndex === i}
                        onChange={() => setQuestionAnswerIndex(i)}
                      />
                      Opción {i + 1}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setQuestionOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleAddQuestion}
                disabled={questionSubmitting || !questionPrompt.trim() || questionOptions.some((o) => !o.trim())}
              >
                {questionSubmitting ? "Agregando…" : "Agregar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Agregar afirmación inferencia */}
        <Dialog open={inferenceOpen} onOpenChange={(open) => { setInferenceOpen(open); if (!open) setInferenceErr(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar afirmación de inferencia</DialogTitle>
              <DialogDescription>Afirmación sobre el texto. Indica si es verdadero, falso o indeterminado.</DialogDescription>
            </DialogHeader>
            {inferenceErr && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{inferenceErr}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Afirmación</Label>
                <Textarea value={inferenceStatement} onChange={(e) => setInferenceStatement(e.target.value)} rows={2} placeholder="El personaje estaba triste porque..." />
              </div>
              <div className="space-y-2">
                <Label>Fragmento de contexto (opcional)</Label>
                <Input value={inferenceContext} onChange={(e) => setInferenceContext(e.target.value)} placeholder="Cita breve del texto" />
              </div>
              <div className="space-y-2">
                <Label>Respuesta correcta</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={inferenceCorrect}
                  onChange={(e) => setInferenceCorrect(e.target.value as "verdadero" | "falso" | "indeterminado")}
                >
                  <option value="verdadero">Verdadero</option>
                  <option value="falso">Falso</option>
                  <option value="indeterminado">Indeterminado</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInferenceOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddInference} disabled={inferenceSubmitting || !inferenceStatement.trim()}>
                {inferenceSubmitting ? "Agregando…" : "Agregar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Agregar par vocabulario */}
        <Dialog open={vocabularyOpen} onOpenChange={(open) => { setVocabularyOpen(open); if (!open) setVocabularyErr(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar par de vocabulario</DialogTitle>
              <DialogDescription>Palabra del texto y su definición adecuada para primaria.</DialogDescription>
            </DialogHeader>
            {vocabularyErr && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{vocabularyErr}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Palabra</Label>
                <Input value={vocabularyWord} onChange={(e) => setVocabularyWord(e.target.value)} placeholder="ej. bosque" />
              </div>
              <div className="space-y-2">
                <Label>Definición</Label>
                <Textarea value={vocabularyDefinition} onChange={(e) => setVocabularyDefinition(e.target.value)} rows={2} placeholder="Lugar con muchos árboles" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVocabularyOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleAddVocabulary}
                disabled={vocabularySubmitting || !vocabularyWord.trim() || !vocabularyDefinition.trim()}
              >
                {vocabularySubmitting ? "Agregando…" : "Agregar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Agregar evento secuencia */}
        <Dialog open={sequenceOpen} onOpenChange={(open) => { setSequenceOpen(open); if (!open) setSequenceErr(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar evento de secuencia</DialogTitle>
              <DialogDescription>Oración que describe un evento del relato en orden cronológico.</DialogDescription>
            </DialogHeader>
            {sequenceErr && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{sequenceErr}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Evento (oración)</Label>
                <Textarea value={sequenceText} onChange={(e) => setSequenceText(e.target.value)} rows={2} placeholder="La niña llegó a la casa." />
              </div>
              <div className="space-y-2">
                <Label>Orden correcto</Label>
                <Input
                  type="number"
                  min={1}
                  value={sequenceOrder}
                  onChange={(e) => setSequenceOrder(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSequenceOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddSequence} disabled={sequenceSubmitting || !sequenceText.trim()}>
                {sequenceSubmitting ? "Agregando…" : "Agregar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="texto" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="texto" className="gap-2">
              <BookOpen className="h-4 w-4" /> Texto
            </TabsTrigger>
            <TabsTrigger value="comprension" className="gap-2">
              <Brain className="h-4 w-4" /> Comprensión
            </TabsTrigger>
            <TabsTrigger value="inferencia" className="gap-2">
              <Lightbulb className="h-4 w-4" /> Inferencia
            </TabsTrigger>
            <TabsTrigger value="vocabulario" className="gap-2">
              <Languages className="h-4 w-4" /> Vocabulario
            </TabsTrigger>
            <TabsTrigger value="secuencias" className="gap-2">
              <ListOrdered className="h-4 w-4" /> Secuencias
            </TabsTrigger>
          </TabsList>

          {/* Texto tab */}
          <TabsContent value="texto">
            <Card>
              <CardHeader>
                <CardTitle>Texto de Lectura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input defaultValue={text.title} readOnly={!!textId} />
                </div>
                <div className="space-y-2">
                  <Label>Contenido</Label>
                  <Textarea defaultValue={text.content} rows={12} readOnly={!!textId} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nivel escolar</Label>
                    <Input type="number" defaultValue={text.gradeLevel} readOnly={!!textId} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tiempo estimado (seg)</Label>
                    <Input type="number" defaultValue={text.estimatedReadingTime} readOnly={!!textId} />
                  </div>
                </div>
                {!textId && <Button>Guardar cambios</Button>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comprensión tab */}
          <TabsContent value="comprension">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Preguntas de Comprensión</CardTitle>
                <Button size="sm" variant="outline" disabled={!textId} onClick={openQuestionDialog} title={!textId ? "Guarda la plantilla primero" : undefined}>+ Agregar pregunta</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Pregunta</TableHead>
                      <TableHead>Opciones</TableHead>
                      <TableHead>Respuesta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprehensionQuestions.map((q: ComprehensionQuestion) => (
                      <TableRow key={q.id}>
                        <TableCell>{q.order}</TableCell>
                        <TableCell className="max-w-xs truncate">{q.question}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{q.options.length} opciones</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{q.options[q.correctAnswerIndex]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inferencia tab */}
          <TabsContent value="inferencia">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Afirmaciones de Inferencia</CardTitle>
                <Button size="sm" variant="outline" disabled={!textId} onClick={openInferenceDialog} title={!textId ? "Guarda la plantilla primero" : undefined}>+ Agregar afirmación</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Afirmación</TableHead>
                      <TableHead>Respuesta correcta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inferenceStatements.map((s: InferenceStatement) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.order}</TableCell>
                        <TableCell className="max-w-sm truncate">{s.statement}</TableCell>
                        <TableCell>
                          <Badge variant={s.correctAnswer === "verdadero" ? "default" : "secondary"}>
                            {s.correctAnswer as string}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vocabulario tab */}
          <TabsContent value="vocabulario">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pares de Vocabulario</CardTitle>
                <Button size="sm" variant="outline" disabled={!textId} onClick={openVocabularyDialog} title={!textId ? "Guarda la plantilla primero" : undefined}>+ Agregar par</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Palabra</TableHead>
                      <TableHead>Definición</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vocabularyPairs.map((p: VocabularyPair) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.order}</TableCell>
                        <TableCell className="font-bold">{p.word}</TableCell>
                        <TableCell>{p.definition}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Secuencias tab */}
          <TabsContent value="secuencias">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Eventos de Secuencia</CardTitle>
                <Button size="sm" variant="outline" disabled={!textId} onClick={openSequenceDialog} title={!textId ? "Guarda la plantilla primero" : undefined}>+ Agregar evento</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Orden</TableHead>
                      <TableHead>Evento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sequenceItems.map((s: SequenceItem) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="outline">{s.correctOrder}</Badge>
                        </TableCell>
                        <TableCell>{s.text}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export { EvaluationConfigPanel };
export default EvaluationConfigPanel;
