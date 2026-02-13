"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

const PAGE_SIZE_OPTIONS = [5, 10, 20];

type Props = {
  basePath: string;
  role: "admin" | "maestro";
  /** Solo para master: institution_id para filtrar sesiones y salones. */
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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [classroomFilter, setClassroomFilter] = useState<string>("");
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
      if (statusFilter) params.set("status", statusFilter);
      if (classroomFilter) params.set("classroom_id", classroomFilter);
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
      setError(e instanceof Error ? e.message : "Error al cerrar sesión");
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
      // Refrescar lista para que el código guardado se actualice
      const refetch = await fetch(`${apiBase}/${sessionId}/attempts`);
      const refetchJson = await refetch.json().catch(() => ({}));
      if (refetch.ok && refetchJson.attempts) setAttempts(refetchJson.attempts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al regenerar código");
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

  const statusLabel: Record<string, string> = {
    open: "Abierta",
    closed: "Cerrada",
    expired: "Expirada",
  };
  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    open: "default",
    closed: "secondary",
    expired: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={gestionHref} className="hover:text-foreground underline">
            Gestión
          </Link>
          <span>/</span>
          <span>Evaluaciones publicadas</span>
        </div>
        <h1 className="text-2xl font-display font-bold">Evaluaciones publicadas</h1>
        <p className="text-muted-foreground mt-1">
          {role === "maestro"
            ? "Tus sesiones publicadas. Cierra una evaluación o regenera códigos para alumnos."
            : "Lista de sesiones publicadas. Puedes cerrar una evaluación manualmente antes de que expire."}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sesiones</CardTitle>
          <CardDescription>
            Tiempo restante, entregados vs pendientes y acción para cerrar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground block">Estado</span>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value="open">Abierta</option>
                <option value="closed">Cerrada</option>
                <option value="expired">Expirada</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground block">Salón</span>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm min-w-[140px]"
                value={classroomFilter}
                onChange={(e) => {
                  setClassroomFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground block">Por página</span>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando sesiones…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay evaluaciones publicadas.
              {role === "maestro"
                ? " Publica una desde Plantillas guardadas (Generar IA / Gestión)."
                : " Los maestros las publican desde Plantillas guardadas."}
            </p>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Salón / Texto</th>
                        <th className="text-left p-3 font-medium">Estado</th>
                        <th className="text-left p-3 font-medium">Tiempo restante</th>
                        <th className="text-left p-3 font-medium">Publicada</th>
                        <th className="text-left p-3 font-medium">Entregados / Total</th>
                        <th className="text-right p-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="p-3">
                            <div className="font-medium">{s.classroom_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {s.text_title}
                              {s.grade_id != null ? ` · ${s.grade_id}°` : ""}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={statusVariant[s.status] ?? "outline"}>
                              {statusLabel[s.status] ?? s.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                s.status === "open" && s.time_left === "Expirada"
                                  ? "text-destructive"
                                  : ""
                              }
                            >
                              {s.time_left ?? "—"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(s.published_at)}
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{s.submitted_count}</span>
                            <span className="text-muted-foreground"> / {s.total_attempts}</span>
                            {s.pending_count > 0 && (
                              <span className="text-muted-foreground text-xs block">
                                {s.pending_count} por entregar
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right flex flex-wrap justify-end gap-1">
                            {role === "maestro" && s.total_attempts > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCodesSheet(s.id)}
                              >
                                Ver códigos
                              </Button>
                            )}
                            {s.status === "open" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleClose(s.id)}
                                disabled={!!closingId}
                              >
                                {closingId === s.id ? "Cerrando…" : "Cerrar sesión"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    {total} sesión(es) en total
                  </p>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
                Los códigos generados al publicar se guardan y se muestran aquí. Si un alumno perdió el suyo, usa &quot;Regenerar código&quot; para generar uno nuevo (el anterior dejará de funcionar).
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {attemptsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (
                attempts.map((a) => (
                  <div
                    key={a.attempt_id}
                    className="rounded border p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{a.student_name}</p>
                      <p className="text-xs text-muted-foreground">Estado: {a.status}</p>
                      {(a.code || regeneratedCode?.attemptId === a.attempt_id) && (
                        <p className="text-sm font-mono mt-1 text-primary">
                          {regeneratedCode?.attemptId === a.attempt_id
                            ? `Nuevo código: ${regeneratedCode.code}`
                            : `Código: ${a.code}`}
                        </p>
                      )}
                    </div>
                    {codesSheetSessionId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleRegenerateCode(codesSheetSessionId, a.attempt_id)
                        }
                        disabled={!!regeneratingId}
                      >
                        {regeneratingId === a.attempt_id
                          ? "Generando…"
                          : "Regenerar código"}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
