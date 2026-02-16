"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Loader2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { EvaluationWizardData } from "@/components/evaluation/evaluation-wizard";

const EvaluationWizard = dynamic(
  () => import("@/components/evaluation/evaluation-wizard").then((m) => m.default),
  { ssr: false }
);

const formSchema = z.object({
  topic: z.string().min(3).max(80),
  grade: z.number().int().min(1).max(3),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  words: z.number().int().min(60).max(220),
  include_questions: z.boolean(),
});

type FormState = z.infer<typeof formSchema>;

type Generated = {
  title: string;
  topic: string;
  difficulty: "facil" | "medio" | "dificil";
  grade: number;
  word_count_estimate: number;
  text: string;
  questions: Array<{
    q: string;
    options: [string, string, string, string];
    answer_index: number;
  }>;
  inference_statements?: Array<{
    statement: string;
    context_fragment: string;
    correct_answer: "verdadero" | "falso" | "indeterminado";
  }>;
  vocabulary_pairs?: Array<{ word: string; definition: string }>;
  sequence_items?: Array<{ text: string; correct_order: number }>;
};

type Classroom = {
  id: string;
  name: string;
  grade_id: number;
};

type PublishResult = {
  session_id: string;
  classroom_id: string;
  text_id: string;
  quiz_id: string;
  question_count: number;
  expires_in_minutes: number;
  codes: Array<{ student_id: string; attempt_id: string; code: string; student_name?: string }>;
};

function mapGeneratedToWizardData(g: Generated): EvaluationWizardData {
  const textId = "preview-text";
  const wordCount = g.text.trim().split(/\s+/).length;
  return {
    text: {
      id: textId,
      title: g.title,
      content: g.text,
      gradeLevel: g.grade,
      wordCount,
      estimatedReadingTime: Math.max(60, Math.ceil(wordCount / 60) * 60),
    },
    comprehensionQuestions: (g.questions ?? []).map((q, i) => ({
      id: `preview-q-${i}`,
      textId,
      question: q.q,
      options: [...q.options],
      correctAnswerIndex: q.answer_index,
      order: i + 1,
    })),
    inferenceStatements: (g.inference_statements ?? []).map((s, i) => ({
      id: `preview-inf-${i}`,
      textId,
      statement: s.statement,
      contextFragment: s.context_fragment ?? "",
      correctAnswer: s.correct_answer,
      order: i + 1,
    })),
    vocabularyPairs: (g.vocabulary_pairs ?? []).map((p, i) => ({
      id: `preview-voc-${i}`,
      textId,
      word: p.word,
      definition: p.definition,
      order: i + 1,
    })),
    sequenceItems: (g.sequence_items ?? []).map((s, i) => ({
      id: `preview-seq-${i}`,
      textId,
      text: s.text,
      correctOrder: s.correct_order ?? i + 1,
    })),
  };
}

export function TextGenerator() {
  const [form, setForm] = useState<FormState>({
    topic: "",
    grade: 1,
    difficulty: "facil",
    words: 120,
    include_questions: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Generated | null>(null);

  const [saveOk, setSaveOk] = useState<{ text_id: string; quiz_id: string } | null>(null);

  // ✅ nuevo: salones del maestro
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");

  // ✅ nuevo: resultado de publicación (códigos)
  const [publishOk, setPublishOk] = useState<PublishResult | null>(null);
  const publishResultRef = useRef<HTMLDivElement>(null);


  const canSubmit = useMemo(() => {
    const parsed = formSchema.safeParse(form);
    return parsed.success && !loading;
  }, [form, loading]);

  // Publicar habilitado cuando hay contenido generado O ya guardado, salón elegido y grado coincide
  const canPublish = useMemo(() => {
    if (!data && !saveOk) return false;
    if (!selectedClassroomId) return false;
    if (publishing || loading || saving) return false;
    const c = classrooms.find((x) => x.id === selectedClassroomId);
    if (!c) return false;
    return c.grade_id === form.grade;
  }, [data, saveOk, selectedClassroomId, publishing, loading, saving, classrooms, form.grade]);

  const loadClassrooms = async () => {
    setLoadingClassrooms(true);
    try {
      // ✅ asumo endpoint estándar para listar salones del maestro
      // Si tu ruta real es otra, me la pasas y lo ajusto.
      const res = await fetch("/api/maestro/classrooms", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al cargar salones");
      const list = (json.classrooms ?? []) as Classroom[];
      setClassrooms(list);

      // auto-select primero del mismo grado si existe
      const sameGrade = list.find((x) => x.grade_id === form.grade);
      if (!selectedClassroomId && sameGrade) setSelectedClassroomId(sameGrade.id);
      else if (!selectedClassroomId && list.length) setSelectedClassroomId(list[0].id);
    } catch (e: any) {
      setClassrooms([]);
      // no “rompas” la pantalla si falla
    } finally {
      setLoadingClassrooms(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // si cambia el grado en el form, intenta auto-seleccionar un salón del mismo grado
  useEffect(() => {
    if (!classrooms.length) return;
    const c = classrooms.find((x) => x.id === selectedClassroomId);
    if (c && c.grade_id === form.grade) return;

    const same = classrooms.find((x) => x.grade_id === form.grade);
    if (same) setSelectedClassroomId(same.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.grade]);

  const onClear = () => {
    setError(null);
    setData(null);
    setSaveOk(null);
    setPublishOk(null);
    setForm({
      topic: "",
      grade: 1,
      difficulty: "facil",
      words: 120,
      include_questions: true,
    });
  };

  const onGenerate = async () => {
    setError(null);
    setSaveOk(null);
    setPublishOk(null);

    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      setError("Revisa los campos: tema (3–80), grado (1–3), palabras (60–220).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Error HTTP ${res.status}`);
      }

      const json = (await res.json()) as Generated;
      setData(json);
    } catch (e: any) {
      setData(null);
      setError(e?.message ?? "Ocurrió un error al generar el texto.");
    } finally {
      setLoading(false);
    }
  };

  const onSaveTemplate = async () => {
    if (!data) return;

    setSaving(true);
    setSaveOk(null);
    setPublishOk(null);
    setError(null);

    try {
      const res = await fetch("/api/save-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          topic: data.topic,
          difficulty: data.difficulty,
          grade: data.grade,
          text: data.text,
          generation_params: {
            model: "gpt-4.1-nano",
            temperature: 0.4,
            words: data.word_count_estimate ?? undefined,
          },
          questions: data.questions ?? [],
          inference_statements: data.inference_statements ?? [],
          vocabulary_pairs: data.vocabulary_pairs ?? [],
          sequence_items: data.sequence_items ?? [],
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }

      const result = json?.result;
      if (result?.text_id && result?.quiz_id) {
        setSaveOk({ text_id: result.text_id, quiz_id: result.quiz_id });
      } else {
        setSaveOk({ text_id: result?.text_id ?? "?", quiz_id: result?.quiz_id ?? "?" });
      }
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    if (!data && !saveOk) return;
    if (!selectedClassroomId) return;

    setPublishing(true);
    setError(null);
    setPublishOk(null);

    try {
      let textId = saveOk?.text_id;
      let quizId = saveOk?.quiz_id;

      // Si hay contenido generado pero no guardado, guardar primero
      if ((!textId || !quizId) && data) {
        const saveRes = await fetch("/api/save-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            topic: data.topic,
            difficulty: data.difficulty,
            grade: data.grade,
            text: data.text,
            generation_params: {
              model: "gpt-4.1-nano",
              temperature: 0.4,
              words: data.word_count_estimate ?? undefined,
            },
            questions: data.questions ?? [],
            inference_statements: data.inference_statements ?? [],
            vocabulary_pairs: data.vocabulary_pairs ?? [],
            sequence_items: data.sequence_items ?? [],
          }),
        });
        const saveJson = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok) throw new Error(saveJson?.message ?? saveJson?.error ?? "Error al guardar");
        const result = saveJson?.result ?? {};
        textId = result.text_id;
        quizId = result.quiz_id;
        if (textId && !quizId) {
          const tRes = await fetch(`/api/templates/${textId}`);
          const tJson = await tRes.json().catch(() => ({}));
          if (tJson?.quiz_id) quizId = tJson.quiz_id;
        }
        if (textId) setSaveOk({ text_id: textId, quiz_id: quizId ?? "" });
        if (!textId || !quizId) throw new Error("No se obtuvo text_id o quiz_id al guardar. Publica desde Configurar.");
      }

      const res = await fetch("/api/maestro/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroom_id: selectedClassroomId,
          text_id: textId,
          quiz_id: quizId,
          expires_in_minutes: 60,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? `HTTP ${res.status}`);

      let raw = json?.result ?? json;
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw) as PublishResult;
        } catch {
          raw = {};
        }
      }
      const rawCodes = Array.isArray((raw as PublishResult)?.codes) ? (raw as PublishResult).codes! : [];
        const payload: PublishResult = {
          session_id: (raw as PublishResult)?.session_id ?? "",
          classroom_id: (raw as PublishResult)?.classroom_id ?? "",
          text_id: (raw as PublishResult)?.text_id ?? "",
          quiz_id: (raw as PublishResult)?.quiz_id ?? "",
          question_count: (raw as PublishResult)?.question_count ?? 0,
          expires_in_minutes: (raw as PublishResult)?.expires_in_minutes ?? 60,
          codes: rawCodes.map((c) => ({
            student_id: c.student_id,
            attempt_id: c.attempt_id,
            code: c.code,
            student_name: (c as { student_name?: string }).student_name,
          })),
        };
      setPublishOk(payload);
      setTimeout(() => publishResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al publicar evaluación.");
    } finally {
      setPublishing(false);
    }
  };

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId) ?? null;
  const gradeMismatch =
    selectedClassroom ? selectedClassroom.grade_id !== form.grade : false;

  const difficultyConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    facil: { label: "Fácil", variant: "default" },
    medio: { label: "Medio", variant: "secondary" },
    dificil: { label: "Difícil", variant: "destructive" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Generar texto (IA)</h1>
        <p className="text-muted-foreground mt-1">
          Genera un texto para lectura y preguntas de comprensión usando inteligencia artificial.
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configuración de generación
          </CardTitle>
          <CardDescription>
            Completa los campos para generar un texto personalizado con preguntas de comprensión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salón destino (para publicar) */}
          <div className="space-y-2">
            <Label>Salón destino (para publicar)</Label>
            <Select
              value={selectedClassroomId || "none"}
              onValueChange={(v) => v !== "none" && setSelectedClassroomId(v)}
              disabled={loadingClassrooms}
            >
              <SelectTrigger className="max-w-xl">
                <SelectValue placeholder="Selecciona un salón" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona un salón</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.grade_id}°)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Solo aparecen salones asignados a ti.
            </p>
            {selectedClassroom && gradeMismatch ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                El salón seleccionado es de {selectedClassroom.grade_id}° pero el texto está en {form.grade}°. No se permitirá publicar.
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Temática</Label>
            <Input
              id="topic"
              placeholder="Ej. Animales del bosque"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">3–80 caracteres</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="grade">Grado</Label>
              <Select
                value={String(form.grade)}
                onValueChange={(v) => setForm((f) => ({ ...f, grade: Number(v) }))}
              >
                <SelectTrigger id="grade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1° grado</SelectItem>
                  <SelectItem value="2">2° grado</SelectItem>
                  <SelectItem value="3">3° grado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificultad</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    difficulty: v as FormState["difficulty"],
                  }))
                }
              >
                <SelectTrigger id="difficulty" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <Label htmlFor="words">Palabras</Label>
              <Input
                id="words"
                type="number"
                min={60}
                max={220}
                value={form.words}
                onChange={(e) => setForm((f) => ({ ...f, words: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">60–220 palabras</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include_questions"
              checked={form.include_questions}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, include_questions: checked === true }))
              }
            />
            <Label htmlFor="include_questions" className="text-sm font-normal cursor-pointer">
              Incluir preguntas de comprensión
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveOk && (
            <div className="flex items-center gap-2 rounded-lg border bg-green-500/10 border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Plantilla guardada exitosamente</p>
                <div className="mt-1 font-mono text-xs opacity-80">
                  text_id: {saveOk.text_id} • quiz_id: {saveOk.quiz_id}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={onGenerate} disabled={!canSubmit}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={onSaveTemplate}
              disabled={!data || loading || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar plantilla
                </>
              )}
            </Button>

            <Button variant="outline" onClick={onClear} disabled={loading || saving || publishing}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>

            <Button onClick={onPublish} disabled={!canPublish}>
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar evaluación"
              )}
            </Button>
          </div>

          {publishOk && (
            <div ref={publishResultRef} className="scroll-mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-lg border bg-primary/10 border-primary/30 px-4 py-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Evaluación publicada</p>
                  <div className="mt-1 font-mono text-xs opacity-80">
                    session_id: {publishOk.session_id} • {publishOk.codes?.length ?? 0} códigos generados
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold text-sm">Códigos generados</p>
                {publishOk.codes?.length ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Comparte un código por alumno para entrar a la evaluación.
                    </p>
                    <div className="overflow-auto rounded-md border">
                      <table className="w-full text-sm">
<thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="p-3">Alumno</th>
                          <th className="p-3">Código</th>
                        </tr>
                      </thead>
                      <tbody>
                        {publishOk.codes.map((c) => (
                          <tr key={c.attempt_id} className="border-t">
                            <td className="p-3 text-sm">{c.student_name ?? c.student_id}</td>
                            <td className="p-3 font-mono text-xs">{c.code}</td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay alumnos en el salón seleccionado. Agrega alumnos al salón para que se generen códigos.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contenido generado: se muestra el wizard como lo verá el alumno */}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Así verá el alumno la evaluación. Usa los botones de abajo para guardar plantilla, publicar o limpiar.
          </p>
          <EvaluationWizard
            data={mapGeneratedToWizardData(data)}
            onSubmit={() => {}}
            isSubmitting={false}
            preview
          />
        </div>
      )}
    </div>
  );
}
