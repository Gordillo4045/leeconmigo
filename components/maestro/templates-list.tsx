"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type TemplateRow = {
  id: string;
  title: string;
  topic: string;
  difficulty: "facil" | "medio" | "dificil" | string;
  grade_id: number;
  created_at: string;
  quiz_id: string | null;
  question_count: number;
};

type Classroom = {
  id: string;
  name: string;
  grade_id: number;
};

type PublishResult = {
  session_id: string;
  codes: Array<{
    student_id: string;
    attempt_id: string;
    code: string;
  }>;
};

export function TemplatesList() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<TemplateRow[]>([]);

  // ✅ Modal publish
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TemplateRow | null>(null);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState<string>("");

  const [expires, setExpires] = useState(60);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  // ✅ Filtros
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | "facil" | "medio" | "dificil"
  >("all");

  async function loadClassrooms() {
    const res = await fetch("/api/classrooms");
    const json = await res.json().catch(() => ({}));
    setClassrooms(json.classrooms ?? []);
  }

  function onOpenPublish(row: TemplateRow) {
    setSelected(row);
    setPublishResult(null);
    setClassroomId("");
    setExpires(60);
    setErr(null);
    setOpen(true);
    loadClassrooms();
  }

  async function onPublish() {
    if (!selected?.quiz_id) return;
    if (!classroomId) return;

    setPublishing(true);
    setErr(null);

    try {
      const res = await fetch("/api/publish-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroom_id: classroomId,
          text_id: selected.id,
          quiz_id: selected.quiz_id,
          expires_in_minutes: expires,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

      setPublishResult(json.result as PublishResult);
    } catch (e: any) {
      setPublishResult(null);
      setErr(e?.message ?? "Error al publicar evaluación.");
    } finally {
      setPublishing(false);
    }
  }

  // ✅ Filtrado client-side
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const gradeOk = gradeFilter === "all" ? true : r.grade_id === gradeFilter;
      const diffOk = difficultyFilter === "all" ? true : r.difficulty === difficultyFilter;
      return gradeOk && diffOk;
    });
  }, [rows, gradeFilter, difficultyFilter]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/templates");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }
      setRows(json.templates ?? []);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message ?? "Error al cargar plantillas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const clearFilters = () => {
    setGradeFilter("all");
    setDifficultyFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Plantillas guardadas</h2>
          <p className="text-sm text-muted-foreground">
            Textos generados que puedes reutilizar y publicar como evaluación.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Cargando..." : "Recargar"}
        </Button>
      </div>

      {/* ✅ Barra de filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Grado</div>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={gradeFilter}
            onChange={(e) =>
              setGradeFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">Todos</option>
            <option value={1}>1°</option>
            <option value={2}>2°</option>
            <option value={3}>3°</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Dificultad</div>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as any)}
          >
            <option value="all">Todas</option>
            <option value="facil">Fácil</option>
            <option value="medio">Medio</option>
            <option value="dificil">Difícil</option>
          </select>
        </label>

        <Button variant="outline" onClick={clearFilters}>
          Limpiar filtros
        </Button>

        <div className="ml-auto text-xs text-muted-foreground">
          Mostrando {filteredRows.length} de {rows.length}
        </div>
      </div>

      {err ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {err}
        </div>
      ) : null}

      <div className="rounded-lg border">
        <div className="grid grid-cols-12 gap-2 p-3 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Título</div>
          <div className="col-span-2">Grado</div>
          <div className="col-span-2">Dificultad</div>
          <div className="col-span-2">Preguntas</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        <Separator />

        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No hay plantillas guardadas aún.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No hay plantillas que coincidan con los filtros.
          </div>
        ) : (
          <div className="divide-y">
            {filteredRows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 p-3 items-center">
                <div className="col-span-4">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.topic}</div>
                </div>
                <div className="col-span-2 text-sm">{r.grade_id}°</div>
                <div className="col-span-2 text-sm capitalize">{r.difficulty}</div>
                <div className="col-span-2 text-sm">{r.question_count}</div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!r.quiz_id || r.question_count < 3 || r.question_count > 8}
                    title={
                      !r.quiz_id
                        ? "Esta plantilla no tiene quiz"
                        : r.question_count < 3 || r.question_count > 8
                        ? "El quiz debe tener entre 3 y 8 preguntas"
                        : "Publicar evaluación"
                    }
                    onClick={() => onOpenPublish(r)}
                  >
                    Publicar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Modal Publicar */}
      {open && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-4 space-y-4">
            <div>
              <div className="text-lg font-semibold">Publicar evaluación</div>
              <div className="text-sm text-muted-foreground">
                {selected.title} • {selected.grade_id}° • {selected.difficulty}
              </div>
            </div>

            <label className="space-y-1 block">
              <span className="text-sm font-medium">Salón</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                <option value="">Selecciona un salón</option>
                {classrooms
                  .filter((c) => c.grade_id === selected.grade_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <span className="text-xs text-muted-foreground">
                Solo se muestran salones del mismo grado.
              </span>
            </label>

            <label className="space-y-1 block">
              <span className="text-sm font-medium">Expiración (minutos)</span>
              <input
                type="number"
                min={10}
                max={240}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={expires}
                onChange={(e) => setExpires(Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground">Rango recomendado: 10–240</span>
            </label>

            {publishResult ? (
              <div className="rounded-md border p-3 space-y-2">
                <div className="font-medium">Códigos generados</div>
                <div className="text-xs text-muted-foreground">
                  Session: <span className="font-mono">{publishResult.session_id}</span>
                </div>
                {publishResult.codes.length ? (
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {publishResult.codes.map((c) => (
                      <li
                        key={c.attempt_id}
                        className="rounded border p-2 text-center font-mono"
                        title={`student_id: ${c.student_id}\nattempt_id: ${c.attempt_id}`}
                      >
                        {c.code}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No se generaron códigos. Verifica alumnos activos en ese salón.
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                  setPublishResult(null);
                  setClassroomId("");
                }}
              >
                Cerrar
              </Button>

              <Button
                disabled={!classroomId || publishing || !selected.quiz_id}
                onClick={onPublish}
              >
                {publishing ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
