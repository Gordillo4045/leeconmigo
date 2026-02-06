"use client";

import { useMemo, useState } from "react";
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

  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Generated | null>(null);

  const [saveOk, setSaveOk] = useState<{ text_id: string; quiz_id: string } | null>(null);

  const canSubmit = useMemo(() => {
    const parsed = formSchema.safeParse(form);
    return parsed.success && !loading;
  }, [form, loading]);

  const onClear = () => {
    setError(null);
    setData(null);
    setSaveOk(null);
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
    setSaveOk(null); // si generas de nuevo, el guardado anterior ya no aplica

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Generar texto (IA)</h1>
        <p className="text-sm text-muted-foreground">
          Genera un texto para lectura y preguntas de comprensión (JSON estructurado).
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">Temática</span>
            <input
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ej. Animales del bosque"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
            <span className="text-xs text-muted-foreground">3–80 caracteres</span>
          </label>

          <label className="space-y-1">
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

          <label className="space-y-1">
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

          <label className="space-y-1">
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

        <label className="flex items-center gap-2">
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

        <div className="flex flex-wrap gap-2">
          <Button onClick={onGenerate} disabled={!canSubmit}>
            {loading ? "Generando..." : "Generar"}
          </Button>

          <Button variant="secondary" onClick={onSaveTemplate} disabled={!data || loading || saving}>
            {saving ? "Guardando..." : "Guardar plantilla"}
          </Button>

          <Button variant="outline" onClick={onClear} disabled={loading || saving}>
            Limpiar
          </Button>

          <Button variant="outline" disabled={!data || loading}>
            Publicar evaluación (próximo)
          </Button>
        </div>
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
