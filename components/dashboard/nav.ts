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

  const base =
    role === "maestro"
      ? "/maestro"
      : role === "admin"
      ? "/admin"
      : "/master";

  return [
    { label: "Generar (IA)", href: base },
    { label: "Resultados", href: `${base}/resultados` },
    { label: "Gestión", href: `${base}/gestion` },
  ];
}
