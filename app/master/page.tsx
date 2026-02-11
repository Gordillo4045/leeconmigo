import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ClipboardList } from "lucide-react";

export default function MasterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Panel Master</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona todas las instituciones: crea y edita instituciones, luego administra alumnos, salones y profesores de cada una.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Instituciones
            </CardTitle>
            <CardDescription>
              Crea, edita y lista todas las instituciones. Desde aquí defines las escuelas que usan el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/master/instituciones">Ir a instituciones</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión alumnos y salones
            </CardTitle>
            <CardDescription>
              Elige una institución y gestiona sus alumnos, salones, inscripciones y asignación de profesores a salones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/master/gestion">Ir a gestión</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Evaluaciones publicadas
            </CardTitle>
            <CardDescription>
              Por institución: ver sesiones de evaluación, cerrar sesiones y ver o regenerar códigos de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/master/gestion/evaluaciones">Ver evaluaciones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}