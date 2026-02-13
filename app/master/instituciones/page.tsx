"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronRight, AlertCircle, X, Plus, Pencil } from "lucide-react";

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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/master" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Instituciones</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Instituciones
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Gestiona todas las instituciones. Crea, edita y entra a cada una para gestionar alumnos, salones y profesores.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/gestion">Gestión alumnos y salones</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/gestion/evaluaciones">Evaluaciones publicadas</Link>
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
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Lista de instituciones</CardTitle>
                <CardDescription>
                  Agrega instituciones y edita nombre o código. Usa &quot;Gestionar&quot; para alumnos, salones y profesores.
                </CardDescription>
              </div>
            </div>
            {!showForm && !editingId && (
              <Button onClick={() => setShowForm(true)} size="sm" className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                Agregar institución
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(showForm || editingId) && (
            <form
              onSubmit={editingId ? handleUpdate : handleCreate}
              className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
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
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : institutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No hay instituciones</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Crea la primera institución con el botón &quot;Agregar institución&quot;.
              </p>
              <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar institución
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground text-sm">{inst.code ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(inst)} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button size="sm" asChild>
                            <Link href={`/master/gestion?institution_id=${inst.id}`}>
                              Gestionar
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
