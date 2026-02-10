import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Panel del director</h1>
        <p className="text-muted-foreground mt-1">Gestiona alumnos, salones y resultados de tu institución.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alumnos y salones
            </CardTitle>
            <CardDescription>Da de alta alumnos e inscribelos en salones. Solo el director (admin) hace esta gestión.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/gestion">Ir a gestión</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Resultados
            </CardTitle>
            <CardDescription>Consulta resultados de evaluaciones por salón y alumno.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/admin/resultados">Ver resultados</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}