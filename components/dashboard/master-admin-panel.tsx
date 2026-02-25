"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Search,
  X,
  Home,
  ClipboardList,
  FileCheck,
  BarChart3,
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Building,
  Shield,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { MASTER_ADMIN_GROUPS } from "./nav";
import type { MasterAdminItem } from "./nav";

const LS_KEY_GROUP = "masterAdminPanelOpenGroup";

const PANEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Inicio: Home,
  "Gestión alumnos y salones": ClipboardList,
  "Evaluaciones publicadas": FileCheck,
  Resultados: BarChart3,
  Dashboard: LayoutDashboard,
  "Generar (IA)": BookOpen,
  Plantillas: FileText,
  Tutores: Users,
  Instituciones: Building,
  Usuarios: Users,
  Master: Shield,
};

function getPanelIcon(label: string) {
  return PANEL_ICONS[label] ?? LayoutDashboard;
}

function itemMatchesSearch(item: MasterAdminItem, query: string): boolean {
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  return item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
}

type GroupKey = "master" | "admin" | "maestro";

export function MasterAdminPanel() {
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");

  // Detect which group owns the current route by finding the longest-matching item href
  const activeGroup = React.useMemo<GroupKey | null>(() => {
    let bestGroup: GroupKey | null = null;
    let bestLen = -1;

    for (const group of MASTER_ADMIN_GROUPS) {
      for (const item of group.items) {
        if (pathname === item.href) {
          // Exact match always wins
          return group.group as GroupKey;
        }
        if (item.href !== "/" && pathname.startsWith(item.href + "/")) {
          if (item.href.length > bestLen) {
            bestLen = item.href.length;
            bestGroup = group.group as GroupKey;
          }
        }
      }
    }
    return bestGroup;
  }, [pathname]);

  // Open group state — default to active route group, then "master"
  const [openGroup, setOpenGroup] = React.useState<GroupKey | null>(
    activeGroup ?? "master"
  );

  // Sync open group from localStorage once after mount
  React.useEffect(() => {
    const saved = localStorage.getItem(LS_KEY_GROUP);
    if (saved === "master" || saved === "admin" || saved === "maestro") {
      setOpenGroup(saved as GroupKey);
    }
  }, []);

  // Filtered groups when searching
  const filteredGroups = React.useMemo(() => {
    const q = search.trim();
    if (!q) return null;
    return MASTER_ADMIN_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => itemMatchesSearch(item, q)),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  // Which group is visually open (auto-expand logic during search)
  const effectiveOpenGroup = React.useMemo<GroupKey | null>(() => {
    if (!filteredGroups) return openGroup;
    if (filteredGroups.length === 0) return null;
    if (filteredGroups.length === 1) return filteredGroups[0].group as GroupKey;
    // Multiple groups with results: prefer group with the active route, else "master"
    const groupWithActive = filteredGroups.find((g) =>
      g.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href + "/"))
      )
    );
    return (groupWithActive?.group ?? "master") as GroupKey;
  }, [filteredGroups, openGroup, pathname]);

  function handleOpenChange(group: GroupKey, shouldOpen: boolean) {
    // During search the accordion is auto-controlled; ignore manual toggles
    if (filteredGroups) return;
    const next = shouldOpen ? group : null;
    setOpenGroup(next);
    if (next) localStorage.setItem(LS_KEY_GROUP, next);
  }

  const displayGroups = filteredGroups ?? MASTER_ADMIN_GROUPS;

  return (
    <div className="flex flex-col gap-1">
      {/* Search input */}
      <div className="relative px-1 pb-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar función…"
          className="h-8 pl-8 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Empty search state */}
      {filteredGroups?.length === 0 && (
        <p className="px-3 py-3 text-center text-xs text-muted-foreground">
          Sin resultados para &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Accordion exclusivo — un grupo abierto a la vez */}
      {displayGroups.map((group) => {
        const isOpen = effectiveOpenGroup === group.group;
        return (
          <Collapsible
            key={group.group}
            open={isOpen}
            onOpenChange={(open) =>
              handleOpenChange(group.group as GroupKey, open)
            }
          >
            <SidebarGroup className="p-0">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`size-3.5 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarGroupContent className="pt-0.5">
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = getPanelIcon(item.label);
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" &&
                          pathname.startsWith(item.href + "/"));
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </div>
  );
}
