"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  codes: Array<{ student_id: string; attempt_id: string; code: string }>;
};

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

  const canSubmit = useMemo(() => {
    const parsed = formSchema.safeParse(form);
    return parsed.success && !loading;
  }, [form, loading]);

  const canPublish = useMemo(() => {
    if (!saveOk) return false;
    if (!selectedClassroomId) return false;
    if (publishing || loading || saving) return false;

    // Si tenemos el salón seleccionado, valida grado vs form.grade (texto guardado)
    const c = classrooms.find((x) => x.id === selectedClassroomId);
    if (!c) return false;
    return c.grade_id === form.grade;
  }, [saveOk, selectedClassroomId, publishing, loading, saving, classrooms, form.grade]);

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
    if (!saveOk) return;
    if (!selectedClassroomId) return;

    setPublishing(true);
    setError(null);
    setPublishOk(null);

    try {
      const res = await fetch("/api/maestro/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroom_id: selectedClassroomId,
          text_id: saveOk.text_id,
          quiz_id: saveOk.quiz_id,
          expires_in_minutes: 60,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? `HTTP ${res.status}`);

      // asume que API devuelve { result: <rpc json> } o directo el json
      const payload = (json?.result ?? json) as PublishResult;
      setPublishOk(payload);
    } catch (e: any) {
      setError(e?.message ?? "Error al publicar evaluación.");
    } finally {
      setPublishing(false);
    }
  };

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId) ?? null;
  const gradeMismatch =
    selectedClassroom ? selectedClassroom.grade_id !== form.grade : false;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Generar texto (IA)</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Genera un texto para lectura y preguntas de comprensión (JSON estructurado).
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        {/* ✅ Selector de salón */}
        <div className="grid gap-2">
          <span className="text-sm font-medium">Salón destino (para publicar)</span>
          <select
            className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            disabled={loadingClassrooms}
          >
            <option value="">Selecciona un salón</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.grade_id}°)
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Solo aparecen salones asignados a ti.
          </span>

          {selectedClassroom && gradeMismatch ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              ⚠ El salón seleccionado es de {selectedClassroom.grade_id}° pero el texto está en {form.grade}°.
              No se permitirá publicar (y la RPC también lo bloquea).
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Temática</span>
            <input
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ej. Animales del bosque"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
            <span className="text-xs text-muted-foreground">3–80 caracteres</span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Grado</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: Number(e.target.value) }))}
            >
              <option value={1}>1°</option>
              <option value={2}>2°</option>
              <option value={3}>3°</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Dificultad</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={form.difficulty}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  difficulty: e.target.value as FormState["difficulty"],
                }))
              }
            >
              <option value="facil">Fácil</option>
              <option value="medio">Medio</option>
              <option value="dificil">Difícil</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Palabras</span>
            <input
              type="number"
              min={60}
              max={220}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={form.words}
              onChange={(e) => setForm((f) => ({ ...f, words: Number(e.target.value) }))}
            />
            <span className="text-xs text-muted-foreground">60–220</span>
          </label>
        </div>

        <label className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            checked={form.include_questions}
            onChange={(e) => setForm((f) => ({ ...f, include_questions: e.target.checked }))}
          />
          <span className="text-sm">Incluir preguntas</span>
        </label>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        ) : null}

        {saveOk ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            ✅ Plantilla guardada
            <div className="mt-1 font-mono text-xs opacity-80">
              text_id: {saveOk.text_id}
              <br />
              quiz_id: {saveOk.quiz_id}
            </div>
          </div>
        ) : null}

        {publishOk ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            ✅ Evaluación publicada
            <div className="mt-1 font-mono text-xs opacity-80">
              session_id: {publishOk.session_id}
              <br />
              classroom_id: {publishOk.classroom_id}
              <br />
              expires_in_minutes: {publishOk.expires_in_minutes}
              <br />
              codes: {publishOk.codes?.length ?? 0}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={onGenerate} disabled={!canSubmit}>
            {loading ? "Generando..." : "Generar"}
          </Button>

          <Button variant="secondary" onClick={onSaveTemplate} disabled={!data || loading || saving}>
            {saving ? "Guardando..." : "Guardar plantilla"}
          </Button>

          <Button variant="outline" onClick={onClear} disabled={loading || saving || publishing}>
            Limpiar
          </Button>

          <Button onClick={onPublish} disabled={!canPublish}>
            {publishing ? "Publicando..." : "Publicar evaluación"}
          </Button>
        </div>

        {/* ✅ Muestra códigos */}
        {publishOk?.codes?.length ? (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="font-semibold">Códigos generados</div>
            <div className="text-xs text-muted-foreground">
              Comparte un código por alumno para entrar a /student/[code].
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">student_id</th>
                    <th className="p-3">attempt_id</th>
                    <th className="p-3">code</th>
                  </tr>
                </thead>
                <tbody>
                  {publishOk.codes.map((c) => (
                    <tr key={c.attempt_id} className="border-t">
                      <td className="p-3 font-mono text-xs">{c.student_id}</td>
                      <td className="p-3 font-mono text-xs">{c.attempt_id}</td>
                      <td className="p-3 font-mono text-xs">{c.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-lg font-semibold">{data.title}</div>
            <div className="text-sm text-muted-foreground">
              Tema: {data.topic} • Grado: {data.grade} • Dificultad: {data.difficulty} • Palabras:{" "}
              {data.word_count_estimate}
            </div>
            <Separator className="my-3" />
            <p className="whitespace-pre-wrap leading-relaxed">{data.text}</p>
          </div>

          {data.questions?.length ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="font-semibold">Preguntas</div>
              <div className="space-y-4">
                {data.questions.map((q, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-sm font-medium">
                      {idx + 1}. {q.q}
                    </div>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {q.options.map((opt, i) => (
                        <li key={i} className="rounded-md border p-2 text-sm">
                          {String.fromCharCode(65 + i)}. {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
