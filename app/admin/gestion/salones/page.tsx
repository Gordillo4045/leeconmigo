"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Classroom = {
  id: string;
  name: string;
  grade_id: number;
};

export default function AdminSalonesPage({
  searchParams,
}: {
  searchParams: { institution_id?: string };
}) {
  const institutionId = searchParams?.institution_id ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [list, setList] = useState<Classroom[]>([]);
  const [name, setName] = useState("");
  const [gradeId, setGradeId] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/classrooms?institution_id=${encodeURIComponent(institutionId)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
      setList((json.classrooms ?? []) as Classroom[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar salones");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function createClassroom() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classrooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          institution_id: institutionId,
          name: name.trim(),
          grade_id: gradeId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
      setName("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear salón");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!institutionId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  if (!institutionId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-display font-bold">Salones</h1>
        <p className="text-muted-foreground">Falta institution_id.</p>
        <Button asChild variant="outline">
          <Link href="/admin">Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Salones</h1>
          <p className="text-muted-foreground mt-1">
            Crea y lista salones de tu institución.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/gestion/alumnos?institution_id=${institutionId}`}>
              Alumnos
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear salón</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <div className="grid gap-2 max-w-xl">
            <label className="text-sm font-medium">Nombre</label>
            <input
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={name}
              placeholder="Ej: 1A"
              onChange={(e) => setName(e.target.value)}
            />

            <label className="text-sm font-medium">Grado</label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={gradeId}
              onChange={(e) => setGradeId(parseInt(e.target.value, 10))}
            >
              <option value={1}>1°</option>
              <option value={2}>2°</option>
              <option value={3}>3°</option>
            </select>

            <Button onClick={createClassroom} disabled={saving || !name.trim()}>
              {saving ? "Creando…" : "Crear"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de salones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando…</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay salones.</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Grado</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{c.grade_id}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
