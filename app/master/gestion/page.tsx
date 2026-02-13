"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GestionPage } from "@/components/admin/gestion-page";
import { ChevronRight, Building2, Users } from "lucide-react";

type Institution = { id: string; name: string; code: string | null };

export default function MasterGestionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const institutionIdFromUrl = searchParams.get("institution_id");

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/master/institutions")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setInstitutions((json.institutions ?? []) as Institution[]);
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
  }, []);

  // Con institution_id en la URL → mostrar gestión de alumnos y salones
  if (institutionIdFromUrl) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/master" className="hover:text-foreground transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/master/gestion" className="hover:text-foreground transition-colors">
              Gestión
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Alumnos y salones</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/gestion">Cambiar institución</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/instituciones">Ver todas las instituciones</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/master/gestion/evaluaciones?institution_id=${institutionIdFromUrl}`}>
              Evaluaciones publicadas
            </Link>
          </Button>
        </div>
        <GestionPage institutionId={institutionIdFromUrl} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full max-w-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sin institution_id → solo selector
  const handleSelectInstitution = (value: string) => {
    if (value) router.push(`/master/gestion?institution_id=${value}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/master" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Gestión alumnos y salones</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Gestión de alumnos y salones
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Elige una institución para gestionar sus alumnos, salones e inscripciones.
        </p>
        <div className="mt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/instituciones">Instituciones</Link>
          </Button>
        </div>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Selecciona institución</CardTitle>
              <CardDescription>
                Al elegir una institución entrarás a la gestión de alumnos y salones de esa institución.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {institutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No hay instituciones</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Crea una institución desde el enlace Instituciones para poder gestionar alumnos y salones.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/master/instituciones">Ir a Instituciones</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Institución</label>
              <Select onValueChange={handleSelectInstitution}>
                <SelectTrigger className="h-10 w-full max-w-xl" id="master-institution">
                  <SelectValue placeholder="Elige una institución…" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                      {i.code ? ` (${i.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
