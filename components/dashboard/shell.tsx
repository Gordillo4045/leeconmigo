"use client";

import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { DashboardSidebar } from "./sidebar";
import type { NavItem } from "./nav";
import { DashboardTopbar } from "./topbar";

export function DashboardShell({
  title,
  nav,
  email,
  fullName,
  children,
}: {
  title: string;
  nav: NavItem[];
  email: string;
  fullName: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="md:hidden">
        <div className="flex h-14 items-center border-b px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <DashboardSidebar title={title} items={nav} />
            </SheetContent>
          </Sheet>
          <div className="ml-2 text-sm font-semibold">{title}</div>
        </div>
      </div>

      <div className="hidden md:block">
        <DashboardTopbar email={email} fullName={fullName} />
      </div>

      <div className="flex">
        <div className="hidden md:block">
          <DashboardSidebar title={title} items={nav} />
        </div>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
