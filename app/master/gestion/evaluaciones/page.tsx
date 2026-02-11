"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationSessionsList } from "@/components/admin/evaluation-sessions-list";

type Institution = { id: string; name: string; code: string | null };

function MasterEvaluacionesContent() {
  const searchParams = useSearchParams();
  const institutionId = searchParams.get("institution_id");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(!institutionId);

  useEffect(() => {
    if (institutionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/master/institutions")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setInstitutions(json.institutions ?? []);
      })
      .catch(() => { if (!cancelled) setInstitutions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [institutionId]);

  if (institutionId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/gestion/evaluaciones">Cambiar institución</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/instituciones">Instituciones</Link>
          </Button>
        </div>
        <EvaluationSessionsList basePath="/master" role="admin" institutionId={institutionId} />
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (institutions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No hay instituciones. Crea una en Instituciones.</p>
          <Button variant="outline" className="mt-2" asChild>
            <Link href="/master/instituciones">Ir a instituciones</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Evaluaciones publicadas</h1>
        <p className="text-muted-foreground mt-1">Elige una institución para ver sus sesiones de evaluación.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Selecciona institución</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {institutions.map((inst) => (
              <li key={inst.id} className="flex items-center justify-between rounded border p-3">
                <span>{inst.name}</span>
                <Button size="sm" asChild>
                  <Link href={`/master/gestion/evaluaciones?institution_id=${inst.id}`}>Ver sesiones</Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MasterGestionEvaluacionesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <MasterEvaluacionesContent />
    </Suspense>
  );
}
