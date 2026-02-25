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
  group: "master" | "admin" | "maestro";
  label: string;
  items: MasterAdminItem[];
};

/** Configuración del Panel Administrativo del master (Master + Admin + Maestro) */
export const MASTER_ADMIN_GROUPS: MasterAdminGroup[] = [
  {
    group: "master",
    label: "Master",
    items: [
      {
        label: "Inicio",
        href: "/master",
        keywords: ["home", "inicio", "panel", "master", "dashboard"],
      },
      {
        label: "Instituciones",
        href: "/master/instituciones",
        keywords: ["instituciones", "escuelas", "colegios", "centros"],
      },
      {
        label: "Usuarios",
        href: "/master/usuarios",
        keywords: ["usuarios", "roles", "perfiles", "cuentas", "maestros", "admins"],
      },
      {
        label: "Plantillas",
        href: "/master/plantillas",
        keywords: ["plantillas", "textos", "lecturas", "contenido"],
      },
    ],
  },
  {
    group: "admin",
    label: "Admin",
    items: [
      {
        label: "Gestión alumnos y salones",
        href: "/master/gestion",
        keywords: ["alumnos", "salones", "gestión", "gestion", "estudiantes", "grupos", "clases"],
      },
      {
        label: "Evaluaciones publicadas",
        href: "/master/gestion/evaluaciones",
        keywords: ["evaluaciones", "publicadas", "tests", "examen", "sesiones"],
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

  if (role === "admin") {
    return [
      { label: "Inicio", href: "/admin" },
      { label: "Gestión alumnos y salones", href: "/admin/gestion" },
      { label: "Evaluaciones publicadas", href: "/admin/gestion/evaluaciones" },
    ];
  }

  // master — getNav() is fallback; la barra lateral usa MasterAdminPanel directamente
  return [
    { label: "Inicio", href: "/master" },
    { label: "Instituciones", href: "/master/instituciones" },
    { label: "Usuarios", href: "/master/usuarios" },
    { label: "Plantillas", href: "/master/plantillas" },
  ];
}
