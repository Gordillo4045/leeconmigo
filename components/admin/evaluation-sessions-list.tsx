"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  Key,
  RefreshCw,
  X,
  Timer,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

type SessionRow = {
  id: string;
  classroom_id: string;
  classroom_name: string;
  grade_id: number | null;
  text_title: string;
  status: string;
  published_at: string;
  expires_at: string;
  closed_at: string | null;
  time_left: string | null;
  total_attempts: number;
  submitted_count: number;
  pending_count: number;
  expired_count: number;
};

type ClassroomOption = { id: string; name: string; grade_id: number };

type AttemptRow = {
  attempt_id: string;
  student_id: string;
  status: string;
  student_name: string;
  curp: string | null;
  code: string | null;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

type Props = {
  basePath: string;
  role: "admin" | "maestro";
  institutionId?: string | null;
};

export function EvaluationSessionsList({ basePath, role, institutionId }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classroomFilter, setClassroomFilter] = useState<string>("all");
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);

  const [codesSheetSessionId, setCodesSheetSessionId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [regeneratedCode, setRegeneratedCode] = useState<{ attemptId: string; code: string } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const apiBase = role === "maestro" ? "/api/maestro/evaluation-sessions" : "/api/admin/evaluation-sessions";
  const gestionHref = `${basePath}/gestion`;

  const loadClassrooms = useCallback(async () => {
    try {
      const url = institutionId
        ? `/api/classrooms?institution_id=${encodeURIComponent(institutionId)}`
        : "/api/classrooms";
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      setClassrooms(json.classrooms ?? []);
    } catch {
      setClassrooms([]);
    }
  }, [institutionId]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (classroomFilter && classroomFilter !== "all") params.set("classroom_id", classroomFilter);
      if (institutionId) params.set("institution_id", institutionId);
      const res = await fetch(`${apiBase}?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al cargar sesiones");
      setSessions(json.sessions ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(Math.max(1, json.total_pages ?? 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar sesiones");
      setSessions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [apiBase, page, pageSize, statusFilter, classroomFilter, institutionId]);

  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleClose = async (sessionId: string) => {
    setClosingId(sessionId);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${sessionId}`, { method: "PATCH" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al cerrar");
      await loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cerrar sesion");
    } finally {
      setClosingId(null);
    }
  };

  const openCodesSheet = async (sessionId: string) => {
    setCodesSheetSessionId(sessionId);
    setAttempts([]);
    setRegeneratedCode(null);
    setAttemptsLoading(true);
    try {
      const res = await fetch(`${apiBase}/${sessionId}/attempts`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error");
      setAttempts(json.attempts ?? []);
    } catch {
      setAttempts([]);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleRegenerateCode = async (sessionId: string, attemptId: string) => {
    setRegeneratingId(attemptId);
    setRegeneratedCode(null);
    try {
      const res = await fetch(`${apiBase}/${sessionId}/attempts/${attemptId}/regenerate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al regenerar");
      setRegeneratedCode({ attemptId, code: json.code ?? "" });
      const refetch = await fetch(`${apiBase}/${sessionId}/attempts`);
      const refetchJson = await refetch.json().catch(() => ({}));
      if (refetch.ok && refetchJson.attempts) setAttempts(refetchJson.attempts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al regenerar codigo");
    } finally {
      setRegeneratingId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    open: {
      label: "Abierta",
      icon: <Timer className="h-3 w-3" />,
      variant: "default",
    },
    closed: {
      label: "Cerrada",
      icon: <CheckCircle2 className="h-3 w-3" />,
      variant: "secondary",
    },
    expired: {
      label: "Expirada",
      icon: <XCircle className="h-3 w-3" />,
      variant: "destructive",
    },
  };

  // Count stats
  const openCount = sessions.filter((s) => s.status === "open").length;
  const closedCount = sessions.filter((s) => s.status === "closed").length;
  const expiredCount = sessions.filter((s) => s.status === "expired").length;
  const totalSessions = sessions.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href={gestionHref} className="hover:text-foreground transition-colors">
              Gestión
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Evaluaciones publicadas</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Evaluaciones publicadas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {role === "maestro"
                ? "Tus sesiones publicadas. Cierra una evaluación o regenera códigos para alumnos."
                : "Lista de sesiones publicadas. Puedes cerrar una evaluación manualmente antes de que expire."}
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>
        )}

        {/* Stat Cards */}
        {!loading && totalSessions > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{totalSessions}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Abiertas</p>
                    <p className="text-2xl font-bold text-green-600">{openCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Timer className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cerradas</p>
                    <p className="text-2xl font-bold text-muted-foreground">{closedCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiradas</p>
                    <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Sesiones</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Tiempo restante, entregados vs pendientes y acción para cerrar.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadSessions} className="gap-2" disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Estado:</span>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Abierta</SelectItem>
                    <SelectItem value="closed">Cerrada</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Salón:</span>
                <Select value={classroomFilter} onValueChange={(v) => { setClassroomFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Por página:</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No hay evaluaciones publicadas</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {role === "maestro"
                    ? "Publica una desde Plantillas guardadas (Generar IA / Gestión)."
                    : "Los maestros las publican desde Plantillas guardadas."}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Salón / Texto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tiempo restante</TableHead>
                        <TableHead>Publicada</TableHead>
                        <TableHead>Progreso</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => {
                        const cfg = statusConfig[s.status] ?? statusConfig.closed;
                        const progress = s.total_attempts > 0 ? Math.round((s.submitted_count / s.total_attempts) * 100) : 0;

                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{s.classroom_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {s.text_title}
                                  {s.grade_id != null ? ` \u00B7 ${s.grade_id}\u00B0` : ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={cfg.variant} className="gap-1.5">
                                {cfg.icon}
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm ${s.status === "open" && s.time_left === "Expirada" ? "text-destructive font-medium" : "text-foreground"}`}>
                                {s.time_left ?? "\u2014"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{formatDate(s.published_at)}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2 min-w-[120px]">
                                <div className="flex items-center gap-2">
                                  <Progress value={progress} className="flex-1 h-2" />
                                  <span className="text-xs font-medium text-foreground tabular-nums whitespace-nowrap">
                                    {s.submitted_count}/{s.total_attempts}
                                  </span>
                                </div>
                                {s.pending_count > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {s.pending_count} por entregar
                                  </p>
                                )}
                                {s.expired_count > 0 && (
                                  <p className="text-xs text-destructive">
                                    {s.expired_count} expirado{s.expired_count > 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {role === "maestro" && s.total_attempts > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openCodesSheet(s.id)}
                                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                                  >
                                    <Key className="h-3.5 w-3.5" />
                                    Códigos
                                  </Button>
                                )}
                                {s.status === "open" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleClose(s.id)}
                                    disabled={!!closingId}
                                    className="gap-1.5"
                                  >
                                    {closingId === s.id ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Cerrando...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-3.5 w-3.5" />
                                        Cerrar
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} de {total} sesión(es)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="h-8"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className="h-8 w-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="h-8"
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── CODES SHEET ─── */}
      {role === "maestro" && (
        <Sheet
          open={codesSheetSessionId !== null}
          onOpenChange={(open) => {
            if (!open) setCodesSheetSessionId(null);
          }}
        >
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Códigos de acceso</SheetTitle>
              <SheetDescription>
                Los códigos generados al publicar se guardan y se muestran aquí. Si un alumno perdió el suyo, usa "Regenerar" para generar uno nuevo (el anterior dejará de funcionar).
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {attemptsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : attempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hay intentos registrados.</p>
                </div>
              ) : (
                attempts.map((a) => {
                  const statusBadgeVariant = a.status === "submitted" ? "default" : a.status === "expired" ? "destructive" : "secondary";
                  return (
                    <div
                      key={a.attempt_id}
                      className="rounded-lg border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-foreground">{a.student_name}</p>
                          {a.curp && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.curp}</p>
                          )}
                          <Badge variant={statusBadgeVariant} className="text-xs mt-1">
                            {a.status}
                          </Badge>
                        </div>
                        {codesSheetSessionId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerateCode(codesSheetSessionId, a.attempt_id)}
                            disabled={!!regeneratingId}
                            className="gap-1.5"
                          >
                            {regeneratingId === a.attempt_id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Generando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                Regenerar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {(a.code || regeneratedCode?.attemptId === a.attempt_id) && (
                        <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                          <Key className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-sm font-mono font-medium text-primary flex-1">
                            {regeneratedCode?.attemptId === a.attempt_id
                              ? regeneratedCode.code
                              : a.code}
                          </p>
                          {regeneratedCode?.attemptId === a.attempt_id && (
                            <Badge className="bg-green-600 text-white text-xs">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
