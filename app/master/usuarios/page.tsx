"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Usuarios (Master)</h1>
          <p className="text-muted-foreground mt-1">
            Asigna rol e institución. Evita updates manuales en SQL Editor.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/master/instituciones">Instituciones</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Buscar</CardTitle>

          <div className="flex gap-2 max-w-xl">
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={q}
              placeholder="Buscar por email o nombre…"
              onChange={(e) => setQ(e.target.value)}
            />
            <Button onClick={() => loadAll(q)} disabled={loading}>
              Buscar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando…</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sin usuarios.</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">Email</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Institución</th>
                    <th className="p-3">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((u) => {
                    const inst = u.institution_id ? institutionsById.get(u.institution_id) : null;
                    const saving = savingId === u.id;

                    return (
                      <tr key={u.id} className="border-t">
                        <td className="p-3 whitespace-nowrap">{u.email}</td>
                        <td className="p-3">{u.full_name || "—"}</td>

                        <td className="p-3">
                          <select
                            className="h-9 rounded-md border bg-background px-2"
                            value={u.role}
                            disabled={saving}
                            onChange={(e) =>
                              updateUser(u.id, { role: e.target.value as UserRow["role"] })
                            }
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3">
                          <select
                            className="h-9 rounded-md border bg-background px-2 min-w-[260px]"
                            value={u.institution_id ?? ""}
                            disabled={saving}
                            onChange={(e) =>
                              updateUser(u.id, {
                                institution_id: e.target.value ? e.target.value : null,
                              })
                            }
                          >
                            <option value="">(Sin institución)</option>
                            {institutions.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                                {i.code ? ` (${i.code})` : ""}
                              </option>
                            ))}
                          </select>

                          <div className="text-xs text-muted-foreground mt-1">
                            Actual: {inst ? `${inst.name}${inst.code ? ` (${inst.code})` : ""}` : "—"}
                          </div>
                        </td>

                        <td className="p-3">
                          {saving ? (
                            <span className="text-xs text-muted-foreground">Guardando…</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Auto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
