"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  RefreshCw,
  X,
  AlertCircle,
  Loader2,
  FileText,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  Eye,
} from "lucide-react";

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

type PreviewQuestion = {
  question_id: string;
  prompt: string;
  order_index: number;
  options: Array<{ option_text: string; is_correct: boolean }>;
};

type PreviewData = {
  text: { id: string; title: string; topic: string; content: string; grade_id: number; difficulty: string };
  questions: PreviewQuestion[];
};

export function TemplatesList() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [hasClassrooms, setHasClassrooms] = useState<boolean | null>(null);

  // Modal publish
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TemplateRow | null>(null);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState<string>("");

  const [expires, setExpires] = useState(60);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  // Preview texto y preguntas
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  // Filtros
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | "facil" | "medio" | "dificil"
  >("all");

  async function loadClassrooms() {
    try {
      const res = await fetch("/api/classrooms");
      const json = await res.json().catch(() => ({}));
      setClassrooms(json.classrooms ?? []);
    } catch {
      setClassrooms([]);
    }
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

  async function onOpenPreview(row: TemplateRow) {
    setPreviewOpen(true);
    setPreviewData(null);
    setPreviewErr(null);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(row.id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error al cargar");
      setPreviewData({
        text: json.text,
        questions: json.questions ?? [],
      });
    } catch (e: unknown) {
      setPreviewErr(e instanceof Error ? e.message : "Error al cargar texto y preguntas");
    } finally {
      setLoadingPreview(false);
    }
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

  // Filtrado client-side
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
      setHasClassrooms(json.hasClassrooms ?? true);
      // Si hay un mensaje específico (como "no tienes salones asignados"), mostrarlo como info, no error
      if (json.message && json.hasClassrooms === false) {
        setErr(json.message);
      }
    } catch (e: any) {
      setRows([]);
      setHasClassrooms(null);
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

  const difficultyConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    facil: { label: "Fácil", variant: "default" },
    medio: { label: "Medio", variant: "secondary" },
    dificil: { label: "Difícil", variant: "destructive" },
  };

  const stats = {
    total: rows.length,
    withQuiz: rows.filter((r) => r.quiz_id).length,
    ready: rows.filter((r) => r.quiz_id && r.question_count >= 3 && r.question_count <= 8).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Plantillas guardadas</h1>
        <p className="text-muted-foreground mt-1">
          Textos generados que puedes reutilizar y publicar como evaluación.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Con quiz</p>
                <p className="text-2xl font-bold">{stats.withQuiz}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Listas</p>
                <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error/Info banner */}
      {err && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          hasClassrooms === false
            ? "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400"
            : "border-destructive/30 bg-destructive/5 text-destructive"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{err}</span>
          <button onClick={() => setErr(null)} className={`${
            hasClassrooms === false
              ? "text-blue-600/60 hover:text-blue-600"
              : "text-destructive/60 hover:text-destructive"
          }`}>
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plantillas</CardTitle>
              <CardDescription>
                Selecciona una plantilla para publicarla como evaluación en un salón.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Grado:</span>
              <Select
                value={gradeFilter === "all" ? "all" : String(gradeFilter)}
                onValueChange={(v) => setGradeFilter(v === "all" ? "all" : Number(v))}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">1°</SelectItem>
                  <SelectItem value="2">2°</SelectItem>
                  <SelectItem value="3">3°</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Dificultad:</span>
              <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v as any)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Mostrando {filteredRows.length} de {rows.length}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No hay plantillas guardadas</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {hasClassrooms === false || err?.includes("salones") || err?.includes("asignado")
                  ? "No tienes salones asignados. Contacta al administrador de tu institución para que te asigne a un salón y así puedas ver las plantillas disponibles."
                  : "Genera textos desde 'Generar IA' y guárdalos como plantillas para reutilizarlos."}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No hay plantillas que coincidan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajusta los filtros para ver más resultados.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Título</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Dificultad</TableHead>
                    <TableHead>Preguntas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const diffCfg = difficultyConfig[r.difficulty] ?? { label: r.difficulty, variant: "outline" as const };
                    const isValid = r.quiz_id && r.question_count >= 3 && r.question_count <= 8;
                    const hasQuiz = !!r.quiz_id;

                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{r.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{r.topic}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.grade_id}°</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={diffCfg.variant}>{diffCfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{r.question_count}</span>
                        </TableCell>
                        <TableCell>
                          {isValid ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Lista
                            </Badge>
                          ) : hasQuiz ? (
                            <Badge variant="secondary">Quiz inválido</Badge>
                          ) : (
                            <Badge variant="outline">Sin quiz</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenPreview(r)}
                              className="gap-1.5"
                              title="Ver texto y preguntas"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onOpenPublish(r)}
                              disabled={!isValid}
                              title={
                                !hasQuiz
                                  ? "Esta plantilla no tiene quiz"
                                  : !isValid
                                  ? "El quiz debe tener entre 3 y 8 preguntas"
                                  : "Publicar evaluación"
                              }
                            >
                              Publicar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Publicar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Publicar evaluación</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {selected.title} • {selected.grade_id}° • {difficultyConfig[selected.difficulty]?.label ?? selected.difficulty}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {err && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {err}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Salón</Label>
              <Select value={classroomId} onValueChange={setClassroomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un salón" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms
                    .filter((c) => c.grade_id === selected?.grade_id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.grade_id}°)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Solo se muestran salones del mismo grado ({selected?.grade_id}°).
              </p>
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
              <p className="text-xs text-muted-foreground">Rango recomendado: 10–240 minutos</p>
            </div>

            {publishResult && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-medium">Evaluación publicada exitosamente</p>
                </div>
                {classroomId && (
                  <div className="text-sm text-muted-foreground">
                    Salón: <span className="font-medium text-foreground">
                      {classrooms.find((c) => c.id === classroomId)?.name ?? classroomId}
                    </span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Sesión: <span className="font-mono text-xs">{publishResult.session_id}</span>
                </div>
                {publishResult.codes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Códigos generados ({publishResult.codes.length})</p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {publishResult.codes.map((c) => (
                        <div
                          key={c.attempt_id}
                          className="rounded border p-2 text-center font-mono text-sm hover:bg-muted/50 transition-colors"
                        >
                          <a
                            href={`/a/${encodeURIComponent(c.code)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            title={`Abrir evaluación (${c.code})`}
                          >
                            {c.code}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No se generaron códigos. Verifica que haya alumnos activos en ese salón.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelected(null);
                setPublishResult(null);
                setClassroomId("");
                setErr(null);
              }}
            >
              Cerrar
            </Button>
            <Button
              onClick={onPublish}
              disabled={!classroomId || publishing || !selected?.quiz_id}
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ver texto y preguntas */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Texto y preguntas</DialogTitle>
            <DialogDescription>
              {previewData?.text && (
                <>
                  {previewData.text.title} • {previewData.text.grade_id}° •{" "}
                  {difficultyConfig[previewData.text.difficulty]?.label ?? previewData.text.difficulty}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando…
            </div>
          ) : previewErr ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {previewErr}
            </div>
          ) : previewData ? (
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Texto</h3>
                <div className="rounded-lg border bg-muted/30 p-5 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {previewData.text.content || "(Sin contenido)"}
                </div>
              </div>
              {previewData.questions.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Preguntas ({previewData.questions.length})
                  </h3>
                  <ol className="space-y-6 list-none pl-0">
                    {previewData.questions.map((q, idx) => (
                      <li key={q.question_id} className="rounded-lg border bg-card p-4 space-y-3">
                        <p className="font-medium text-foreground text-[15px] leading-snug">
                          {idx + 1}. {q.prompt}
                        </p>
                        <ul className="space-y-2 pl-1">
                          {q.options.map((opt, i) => (
                            <li
                              key={i}
                              className={`text-[15px] leading-relaxed flex items-start gap-2 py-1 ${opt.is_correct ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}
                            >
                              <span className="flex-1">{opt.option_text}</span>
                              {opt.is_correct && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Esta plantilla no tiene preguntas de quiz.</p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
