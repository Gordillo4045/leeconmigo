"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  ClipboardList,
  BookOpen,
  ChevronRight,
  GraduationCap,
  FileCheck,
} from "lucide-react";

type DashboardData = {
  institutionsCount: number;
  classroomsCount: number;
  studentsCount: number;
  activeSessionsCount: number;
  submittedAttemptsCount: number;
  roleCounts: { admin: number; maestro: number; tutor: number; master: number };
};

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  href?: string;
}) {
  const content = (
    <Card className="border border-border shadow-sm transition-colors hover:bg-muted/30">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>
          {href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-3xl font-bold text-foreground">
          {value === null ? "—" : value.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function MasterPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/master/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json as DashboardData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const d = data;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Inicio</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Panel Master</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Visión global del sistema: instituciones, usuarios y evaluaciones.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Building2 className="h-5 w-5 text-primary" />}
          label="Instituciones"
          value={loading ? null : (d?.institutionsCount ?? 0)}
          href="/master/instituciones"
        />
        <StatCard
          icon={<ClipboardList className="h-5 w-5 text-primary" />}
          label="Salones"
          value={loading ? null : (d?.classroomsCount ?? 0)}
          href="/master/gestion"
        />
        <StatCard
          icon={<GraduationCap className="h-5 w-5 text-primary" />}
          label="Alumnos registrados"
          value={loading ? null : (d?.studentsCount ?? 0)}
          href="/master/gestion"
        />
        <StatCard
          icon={<FileCheck className="h-5 w-5 text-primary" />}
          label="Sesiones activas"
          value={loading ? null : (d?.activeSessionsCount ?? 0)}
          href="/master/gestion/evaluaciones"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          label="Evaluaciones enviadas"
          value={loading ? null : (d?.submittedAttemptsCount ?? 0)}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Usuarios registrados"
          value={loading ? null : ((d?.roleCounts.admin ?? 0) + (d?.roleCounts.maestro ?? 0) + (d?.roleCounts.tutor ?? 0))}
          href="/master/usuarios"
        />
      </div>

      {/* Roles breakdown */}
      {d && (
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribución de usuarios</CardTitle>
            <CardDescription className="text-sm">Usuarios activos por rol</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{d.roleCounts.admin}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Administradores</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{d.roleCounts.maestro}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Maestros</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{d.roleCounts.tutor}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tutores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick access */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instituciones</CardTitle>
            <CardDescription className="text-sm">
              Crea y edita las escuelas del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/master/instituciones">
                Gestionar <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Usuarios</CardTitle>
            <CardDescription className="text-sm">
              Asigna roles e instituciones a los usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/master/usuarios">
                Administrar <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gestión</CardTitle>
            <CardDescription className="text-sm">
              Alumnos, salones e inscripciones por institución.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/master/gestion">
                Gestionar <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
