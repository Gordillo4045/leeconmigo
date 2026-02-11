"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminGestionPage from "@/app/admin/gestion/page";

type Institution = {
  id: string;
  name: string;
  code: string | null;
};

function MasterGestionContent() {
  const searchParams = useSearchParams();
  const institutionIdFromUrl = searchParams.get("institution_id");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(!institutionIdFromUrl);

  useEffect(() => {
    if (institutionIdFromUrl) {
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
  }, [institutionIdFromUrl]);

  if (institutionIdFromUrl) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/gestion">Cambiar institución</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/instituciones">Ver todas las instituciones</Link>
          </Button>
        </div>
        <AdminGestionPage institutionId={institutionIdFromUrl} />
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Gestión por institución</h1>
        <p className="text-muted-foreground mt-1">
          Elige una institución para gestionar sus alumnos, salones y profesores.
        </p>
        <div className="mt-3">
          <Button variant="outline" asChild>
            <Link href="/master/instituciones">Gestionar instituciones</Link>
          </Button>
        </div>
      </div>

      {institutions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No hay instituciones. Crea una en el enlace de arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona una institución</CardTitle>
            <CardDescription>Haz clic en &quot;Gestionar&quot; para ver alumnos, salones y profesores de esa institución.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {institutions.map((inst) => (
                <li key={inst.id} className="flex items-center justify-between rounded border p-3">
                  <span className="font-medium">{inst.name}</span>
                  <span className="text-muted-foreground text-sm font-mono">{inst.code ?? "—"}</span>
                  <Button size="sm" asChild>
                    <Link href={`/master/gestion?institution_id=${inst.id}`}>Gestionar</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MasterGestionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <MasterGestionContent />
    </Suspense>
  );
}
