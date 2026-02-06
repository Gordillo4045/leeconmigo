"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DashboardTopbar({
  email,
  fullName,
}: {
  email: string;
  fullName: string | null;
}) {
  const initials = useMemo(() => {
    const base = (fullName ?? email).trim();
    if (!base) return "U";
    return base
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  }, [email, fullName]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ✅ Lee la foto directamente de Supabase Auth (Google OAuth metadata)
  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data } = await supabase.auth.getUser();
      const meta: any = data?.user?.user_metadata ?? {};
      const url =
        meta.avatar_url ||
        meta.picture ||
        meta.picture_url ||
        meta.avatar ||
        null;

      if (typeof url === "string" && url.length > 0) setAvatarUrl(url);
    })();
  }, []);

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="text-sm text-muted-foreground">
        {fullName ? <span className="font-medium text-foreground">{fullName}</span> : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 px-2">
            <Avatar className="h-8 w-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={fullName ?? email ?? "Usuario"} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <span className="ml-2 hidden text-sm text-muted-foreground md:inline">
              {email}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
