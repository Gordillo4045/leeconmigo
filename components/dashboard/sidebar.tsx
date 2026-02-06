"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import type { NavItem } from "./nav";

export function DashboardSidebar({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <aside className="h-full w-64 border-r bg-background">
      <div className="p-4">
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <div className="text-xs text-muted-foreground">Panel</div>
      </div>

      <Separator />

      <nav className="p-2">
        {items.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href + "/"));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "block rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
