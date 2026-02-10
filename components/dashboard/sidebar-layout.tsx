"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { NavItem } from "./nav";
import type { UserRole } from "@/lib/auth/roles";

type SidebarLayoutProps = {
  title?: string;
  nav: NavItem[];
  role: UserRole;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  children: ReactNode;
};

/**
 * Misma estructura que el patrón:
 * <SidebarProvider>
 *   <AppSidebar />
 *   <main><SidebarTrigger />{children}</main>
 * </SidebarProvider>
 * Usado solo en rutas con sidebar: master, maestro, admin, tutor.
 */
export function SidebarLayout({
  title,
  nav,
  role,
  email,
  fullName,
  avatarUrl,
  children,
}: SidebarLayoutProps) {
  return (
    <SidebarProvider key={role}>
      <AppSidebar
        key={role}
        navMain={nav}
        role={role}
        email={email}
        fullName={fullName}
        avatarUrl={avatarUrl ?? null}
        className="shrink-0"
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger aria-label="Abrir o expandir menú" />
          {title ? (
            <span className="min-w-0 truncate text-sm font-semibold" title={title}>
              {title}
            </span>
          ) : null}
        </header>
        <div className="flex-1 min-h-0 p-6 md:p-8 w-full">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
