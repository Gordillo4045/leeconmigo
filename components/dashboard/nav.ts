import type { UserRole } from "@/lib/auth/roles";

export type NavItem = {
  label: string;
  href: string;
};

export function getNav(role: UserRole): NavItem[] {
  if (role === "tutor") {
    return [
      { label: "Resultados", href: "/tutor" },
      { label: "Notificaciones", href: "/tutor/notificaciones" },
    ];
  }

  if (role === "maestro") {
    return [
      { label: "Dashboard", href: "/maestro" },
      { label: "Generar (IA)", href: "/maestro/generar-ia" },
      { label: "Resultados", href: "/maestro/resultados" },
      { label: "Gestión", href: "/maestro/gestion" },
      { label: "Evaluaciones publicadas", href: "/maestro/gestion/evaluaciones" },
    ];
  }

  const base =
    role === "admin"
      ? "/admin"
      : "/master";

  const items: NavItem[] = [
    { label: "Inicio", href: base },
    { label: "Gestión alumnos y salones", href: `${base}/gestion` },
    { label: "Evaluaciones publicadas", href: `${base}/gestion/evaluaciones` },
    { label: "Resultados", href: `${base}/resultados` },
  ];

  if (role === "master") {
    items.splice(1, 0, { label: "Instituciones", href: "/master/instituciones" });
  }

  return items;
}
