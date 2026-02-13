"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Users, AlertCircle, X, Search, Loader2 } from "lucide-react";

type Institution = { id: string; name: string; code: string | null };

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "master" | "admin" | "maestro" | "tutor";
  institution_id: string | null;
  created_at: string;
};

const ROLES: UserRow["role"][] = ["master", "admin", "maestro", "tutor"];

export default function MasterUsuariosPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const institutionsById = useMemo(() => {
    const m = new Map<string, Institution>();
    for (const i of institutions) m.set(i.id, i);
    return m;
  }, [institutions]);

  async function loadAll(search?: string) {
    setLoading(true);
    setError(null);

    try {
      const [usersRes, instRes] = await Promise.all([
        fetch(`/api/master/users${search ? `?q=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" }),
        fetch("/api/master/institutions", { cache: "no-store" }),
      ]);

      const usersJson = await usersRes.json().catch(() => ({}));
      const instJson = await instRes.json().catch(() => ({}));

      if (!usersRes.ok) throw new Error(usersJson?.error ?? `Users ${usersRes.status}`);
      if (!instRes.ok) throw new Error(instJson?.error ?? `Institutions ${instRes.status}`);

      setUsers((usersJson.users ?? []) as UserRow[]);
      setInstitutions((instJson.institutions ?? []) as Institution[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
      setUsers([]);
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateUser(userId: string, patch: Partial<Pick<UserRow, "role" | "institution_id">>) {
    setSavingId(userId);
    setError(null);

    try {
      const res = await fetch(`/api/master/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...json.user } : u)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar usuario");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/master" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Usuarios</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Usuarios (Master)
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Asigna rol e institución a los usuarios del sistema.
        </p>
        <div className="mt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/instituciones">Instituciones</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Lista de usuarios</CardTitle>
                <CardDescription>
                  Busca por email o nombre y asigna rol e institución.
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2 max-w-xl flex-1 sm:max-w-sm">
              <Input
                className="h-9"
                value={q}
                placeholder="Buscar por email o nombre…"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAll(q)}
              />
              <Button onClick={() => loadAll(q)} disabled={loading} size="sm" className="gap-1 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Sin usuarios</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                No hay usuarios que coincidan con la búsqueda o aún no hay registros.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Institución</TableHead>
                    <TableHead className="w-20">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const inst = u.institution_id ? institutionsById.get(u.institution_id) : null;
                    const saving = savingId === u.id;

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="whitespace-nowrap font-medium">{u.email}</TableCell>
                        <TableCell>{u.full_name || "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            disabled={saving}
                            onValueChange={(value) => updateUser(u.id, { role: value as UserRow["role"] })}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.institution_id ?? "none"}
                            disabled={saving}
                            onValueChange={(value) =>
                              updateUser(u.id, {
                                institution_id: value === "none" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 min-w-[200px]">
                              <SelectValue placeholder="Sin institución" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">(Sin institución)</SelectItem>
                              {institutions.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name}
                                  {i.code ? ` (${i.code})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {inst && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {inst.name}
                              {inst.code ? ` (${inst.code})` : ""}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
    </div>
  );
}
