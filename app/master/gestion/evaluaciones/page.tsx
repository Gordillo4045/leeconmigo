"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EvaluationSessionsList } from "@/components/admin/evaluation-sessions-list";
import { ChevronRight, ClipboardList, Building2 } from "lucide-react";

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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/master" className="hover:text-foreground transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/master/gestion/evaluaciones" className="hover:text-foreground transition-colors">
              Evaluaciones publicadas
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Sesiones</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/master/gestion?institution_id=${institutionId}`}>Gestión alumnos y salones</Link>
          </Button>
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
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (institutions.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/master" className="hover:text-foreground transition-colors">Inicio</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Evaluaciones publicadas</span>
          </div>
        </div>
        <Card className="border border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No hay instituciones</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Crea una institución en el enlace Instituciones para ver sus evaluaciones publicadas.
            </p>
            <Button variant="outline" className="mt-4" size="sm" asChild>
              <Link href="/master/instituciones">Ir a Instituciones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/master" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Evaluaciones publicadas</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Evaluaciones publicadas
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Elige una institución para ver sus sesiones de evaluación.
        </p>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Selecciona institución</CardTitle>
              <CardDescription>
                Ver sesiones publicadas, cerrar evaluaciones o regenerar códigos por institución.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {institutions.map((inst) => (
              <li key={inst.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                <span className="font-medium text-foreground">{inst.name}</span>
                <Button size="sm" asChild>
                  <Link href={`/master/gestion/evaluaciones?institution_id=${inst.id}`}>
                    Ver sesiones
                  </Link>
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
