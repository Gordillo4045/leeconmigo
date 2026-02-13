import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ClipboardList, ChevronRight } from "lucide-react";

export default function MasterPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Inicio</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Panel Master
        </h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Gestiona todas las instituciones: crea y edita instituciones, luego administra alumnos, salones y profesores de cada una.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Instituciones</CardTitle>
                <CardDescription className="text-sm">
                  Crea, edita y lista todas las instituciones. Define las escuelas que usan el sistema.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/master/instituciones">Ir a instituciones</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Gestión alumnos y salones</CardTitle>
                <CardDescription className="text-sm">
                  Elige una institución y gestiona alumnos, salones, inscripciones y profesores.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href="/master/gestion">
                Ir a gestión
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Evaluaciones publicadas</CardTitle>
                <CardDescription className="text-sm">
                  Por institución: sesiones, cerrar evaluaciones y códigos de acceso.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href="/master/gestion/evaluaciones">Ver evaluaciones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}