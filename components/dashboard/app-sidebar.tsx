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

  // Master usa email/password (sin foto de Google) — generamos un avatar decorativo único por cuenta
  const effectiveAvatarUrl =
    avatarUrl ??
    (role === "master"
      ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(email)}`
      : undefined);

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <Sidebar collapsible="offcanvas" {...props} variant="inset">
      <SidebarHeader className="p-3 pb-2">
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
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2">
        {role === "master" ? (
          /* Panel administrativo — siempre activo para master */
          <SidebarGroup className="p-0 pt-2">
            <MasterAdminPanel />
          </SidebarGroup>
        ) : (
          /* Navegación estándar para los demás roles */
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
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="size-7">
                    <AvatarImage src={effectiveAvatarUrl} alt={displayName} />
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
