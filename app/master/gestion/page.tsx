"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationSessionsList } from "@/components/admin/evaluation-sessions-list";

type Institution = { id: string; name: string; code: string | null };

export default function MasterEvaluacionesPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/master/institutions")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const list = (json.institutions ?? []) as Institution[];
        setInstitutions(list);
        if (!institutionId && list.length) setInstitutionId(list[0].id);
      })
      .catch(() => {
        if (!cancelled) setInstitutions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLabel = useMemo(() => {
    const i = institutions.find((x) => x.id === institutionId);
    return i ? `${i.name}${i.code ? ` (${i.code})` : ""}` : "";
  }, [institutions, institutionId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Evaluaciones publicadas (Master)</h1>
        <p className="text-muted-foreground mt-1">
          Primero elige una institución. Luego podrás ver sesiones, cerrar evaluaciones y revisar intentos.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/master/instituciones">Instituciones</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={institutionId ? `/master/gestion?institution_id=${institutionId}` : "/master/gestion"}>
  Gestión alumnos y salones
</Link>

          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institución</CardTitle>
          <CardDescription>Master debe filtrar por institución para listar sesiones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando instituciones…</p>
          ) : institutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay instituciones. Crea una desde /master/instituciones.
            </p>
          ) : (
            <>
              <label className="text-sm font-medium">Selecciona institución</label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm w-full max-w-xl"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {i.code ? ` (${i.code})` : ""}
                  </option>
                ))}
              </select>

              {selectedLabel ? (
                <p className="text-xs text-muted-foreground">Seleccionada: {selectedLabel}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {institutionId ? (
        <EvaluationSessionsList basePath="/master" role="admin" institutionId={institutionId} />
      ) : null}
    </div>
  );
}
