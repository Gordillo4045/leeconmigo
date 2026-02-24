import type { UserRole } from "@/lib/auth/roles";

export type NavItem = {
  label: string;
  href: string;
  keywords?: string[];
};

export type MasterAdminItem = {
  label: string;
  href: string;
  keywords?: string[];
};

export type MasterAdminGroup = {
  group: "admin" | "maestro";
  label: string;
  items: MasterAdminItem[];
};

/** Configuración del Panel Administrativo del master (Admin + Maestro) */
export const MASTER_ADMIN_GROUPS: MasterAdminGroup[] = [
  {
    group: "admin",
    label: "Admin",
    items: [
      {
        label: "Inicio",
        href: "/admin",
        keywords: ["home", "inicio", "panel", "admin"],
      },
      {
        label: "Gestión alumnos y salones",
        href: "/admin/gestion",
        keywords: ["alumnos", "salones", "gestión", "gestion", "estudiantes", "grupos", "clases"],
      },
      {
        label: "Evaluaciones publicadas",
        href: "/admin/gestion/evaluaciones",
        keywords: ["evaluaciones", "publicadas", "tests", "examen", "sesiones"],
      },
      {
        label: "Resultados",
        href: "/admin/resultados",
        keywords: ["resultados", "reportes", "estadísticas", "metricas", "datos"],
      },
    ],
  },
  {
    group: "maestro",
    label: "Maestro",
    items: [
      {
        label: "Dashboard",
        href: "/maestro",
        keywords: ["dashboard", "inicio", "panel", "maestro", "home"],
      },
      {
        label: "Generar (IA)",
        href: "/maestro/generar-ia",
        keywords: ["ia", "generar", "inteligencia", "artificial", "textos", "contenido", "ai"],
      },
      {
        label: "Resultados",
        href: "/maestro/resultados",
        keywords: ["resultados", "reportes", "estadísticas", "metricas", "datos"],
      },
      {
        label: "Plantillas",
        href: "/maestro/gestion",
        keywords: ["plantillas", "gestion", "gestión", "textos", "lecturas"],
      },
      {
        label: "Evaluaciones publicadas",
        href: "/maestro/gestion/evaluaciones",
        keywords: ["evaluaciones", "publicadas", "tests", "examen", "sesiones"],
      },
      {
        label: "Tutores",
        href: "/maestro/tutores",
        keywords: ["tutores", "padres", "guardianes", "familia", "apoderados"],
      },
    ],
  },
];

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
      { label: "Plantillas", href: "/maestro/gestion" },
      { label: "Evaluaciones publicadas", href: "/maestro/gestion/evaluaciones" },
      { label: "Tutores", href: "/maestro/tutores" },
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
    items.splice(1, 0,
      { label: "Instituciones", href: "/master/instituciones" },
      { label: "Usuarios", href: "/master/usuarios" },
      { label: "Plantillas", href: "/master/plantillas" },
    );
  }

  return items;
}
