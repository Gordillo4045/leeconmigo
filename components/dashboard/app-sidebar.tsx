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
  Building,
  BookOpen,
  User2,
  Moon,
  Sun,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

const DEFAULT_ICON = LayoutDashboard;
const LABEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Generar (IA)": BookOpen,
  Resultados: BarChart3,
  Gestión: Settings,
};

function getIconForLabel(label: string) {
  return LABEL_ICONS[label] ?? DEFAULT_ICON;
}

const CONFIG_MASTER: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { title: "Instituciones", url: "/master/instituciones", icon: Building },
];

export type AppSidebarProps = {
  navMain: NavItem[];
  role: UserRole;
  fullName: string | null;
  email: string;
} & React.ComponentProps<typeof Sidebar>;

export function AppSidebar({
  navMain,
  role,
  fullName,
  email,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const displayName = fullName?.trim() || email || "Usuario";
  const hasConfig = role === "master" && CONFIG_MASTER.length > 0;

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
                      isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))}
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

        {hasConfig && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
              Configuración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Configuración">
                        <Settings className="size-4 shrink-0" />
                        <span>Configuración</span>
                        <ChevronDown className="ml-auto size-4" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {CONFIG_MASTER.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.url}
                            >
                              <Link href={item.url}>
                                <item.icon className="size-4 shrink-0" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
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
                  <User2 className="size-4 shrink-0" />
                  <span>{displayName}</span>
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
