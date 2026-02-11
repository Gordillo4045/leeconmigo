"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Institution = {
  id: string;
  name: string;
  code: string | null;
  created_at?: string;
};

export default function MasterInstitucionesPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInstitutions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/master/institutions");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al cargar instituciones");
      setInstitutions(json.institutions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/master/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), code: formCode.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al crear");
      setFormName("");
      setFormCode("");
      setShowForm(false);
      await loadInstitutions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (inst: Institution) => {
    setEditingId(inst.id);
    setFormName(inst.name);
    setFormCode(inst.code ?? "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/institutions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), code: formCode.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al actualizar");
      setEditingId(null);
      setFormName("");
      setFormCode("");
      await loadInstitutions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormCode("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Instituciones</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona todas las instituciones. Crea, edita y luego entra a cada una para gestionar alumnos, salones y profesores.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/master/gestion">Gestión alumnos y salones</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/master/gestion/evaluaciones">Evaluaciones publicadas</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de instituciones</CardTitle>
          <CardDescription>Agrega instituciones y edita nombre o código. Luego usa &quot;Gestionar&quot; para ver alumnos, salones y profesores de esa institución.</CardDescription>
          <div className="pt-2">
            {!showForm && !editingId && (
              <Button onClick={() => setShowForm(true)}>Agregar institución</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(showForm || editingId) && (
            <form
              onSubmit={editingId ? handleUpdate : handleCreate}
              className="rounded-lg border bg-muted/30 p-4 space-y-3"
            >
              <div className="grid gap-2">
                <Label htmlFor="inst_name">Nombre</Label>
                <Input
                  id="inst_name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Primaria Benito Juárez"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inst_code">Código (opcional)</Label>
                <Input
                  id="inst_code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Ej. PBJ01"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : editingId ? "Actualizar" : "Crear"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : institutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay instituciones. Crea la primera arriba.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Código</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.id} className="border-b last:border-0">
                      <td className="p-3">{inst.name}</td>
                      <td className="p-3 font-mono text-muted-foreground">{inst.code ?? "—"}</td>
                      <td className="p-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(inst)}>
                          Editar
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/master/gestion?institution_id=${inst.id}`}>
                            Gestionar
                          </Link>
                        </Button>
                      </td>
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
