"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  BookOpen,
  Moon,
  Sun,
  Home,
  Building,
  Users,
  ClipboardList,
  FileCheck,
  Bell,
  FileText,
  Shield,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import type { NavItem } from "./nav";
import type { UserRole } from "@/lib/auth/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MasterAdminPanel } from "./master-admin-panel";

const LS_KEY_PANEL = "masterAdminPanelEnabled";

const DEFAULT_ICON = LayoutDashboard;
const LABEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Inicio: Home,
  Instituciones: Building,
  Usuarios: Users,
  "Gestión alumnos y salones": ClipboardList,
  "Evaluaciones publicadas": FileCheck,
  Resultados: BarChart3,
  Dashboard: LayoutDashboard,
  "Generar (IA)": BookOpen,
  Plantillas: FileText,
  Gestión: Settings,
  Notificaciones: Bell,
};

function getIconForLabel(label: string) {
  return LABEL_ICONS[label] ?? DEFAULT_ICON;
}

export type AppSidebarProps = {
  navMain: NavItem[];
  role: UserRole;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
} & React.ComponentProps<typeof Sidebar>;

export function AppSidebar({
  navMain,
  role,
  fullName,
  email,
  avatarUrl,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const displayName = fullName?.trim() || email || "Usuario";

  // Panel administrativo — solo para master
  const [isPanelEnabled, setIsPanelEnabled] = React.useState(true);

  React.useEffect(() => {
    if (role !== "master") return;
    const saved = localStorage.getItem(LS_KEY_PANEL);
    if (saved === "false") setIsPanelEnabled(false);
  }, [role]);

  function enablePanel() {
    setIsPanelEnabled(true);
    localStorage.setItem(LS_KEY_PANEL, "true");
  }

  function disablePanel() {
    setIsPanelEnabled(false);
    localStorage.setItem(LS_KEY_PANEL, "false");
  }

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  const showAdminPanel = role === "master" && isPanelEnabled;

  return (
    <Sidebar collapsible="offcanvas" {...props} variant="inset">
      <SidebarHeader className="p-3 pb-2">
        {/* Branding — siempre visible */}
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold">
            LC
          </div>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Lee Conmigo</span>
            <span className="truncate text-xs text-muted-foreground">
              Evaluación temprana de lectura
            </span>
          </div>
        </div>

        {/* Banner del panel administrativo — solo cuando está activo */}
        {showAdminPanel && (
          <div className="mt-2 rounded-md border border-primary/25 bg-primary/10 px-3 py-2">
            <p className="text-xs font-semibold text-primary leading-tight">
              Panel administrativo activo
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              Funciones organizadas por rol
            </p>
            <button
              type="button"
              onClick={disablePanel}
              className="mt-1.5 text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Cerrar panel administrativo
            </button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2">
        {showAdminPanel ? (
          /* ── Panel administrativo (Admin + Maestro) ── */
          <SidebarGroup className="p-0 pt-2">
            <MasterAdminPanel />
          </SidebarGroup>
        ) : (
          <>
            {/* Botón para reabrir el panel — solo para master cuando está cerrado */}
            {role === "master" && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                  Administración
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={enablePanel}
                        tooltip="Panel administrativo"
                      >
                        <Shield className="size-4" />
                        <span>Panel administrativo</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Navegación estándar */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                Navegación
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navMain.map((item) => {
                    const Icon = getIconForLabel(item.label);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            pathname === item.href ||
                            (item.href !== "/" &&
                              pathname.startsWith(item.href + "/"))
                          }
                          tooltip={item.label}
                        >
                          <Link href={item.href}>
                            <Icon className="size-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="size-7">
                    <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                    <AvatarFallback>
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[120px]">{displayName}</span>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-[200px]"
              >
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center px-2 py-1.5 text-sm cursor-pointer"
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    <span>Cambiar tema</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
