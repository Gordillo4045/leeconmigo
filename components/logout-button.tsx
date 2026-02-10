"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Home, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type UserInfo = {
  email: string | null;
  avatarUrl: string | null;
  role: "master" | "admin" | "maestro" | "tutor" | null;
  fullName: string | null;
};

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<UserInfo | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Obtener perfil para conocer rol y nombre
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUser({
        email: user.email ?? null,
        role: (profile?.role as UserInfo["role"]) ?? null,
        fullName: (profile?.full_name as string | null) ?? null,
        // Google guarda la foto en 'picture'; Supabase a veces en 'avatar_url'
        avatarUrl:
          user.user_metadata?.avatar_url ??
          user.user_metadata?.picture ??
          null,
      });
    };

    loadUser();
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const initial =
    (user?.fullName?.charAt(0) ??
      user?.email?.charAt(0) ??
      "?")?.toUpperCase();

  const getHomeForRole = (role: UserInfo["role"]) => {
    switch (role) {
      case "maestro":
        return "/maestro";
      case "tutor":
        return "/tutor";
      case "admin":
        return "/admin";
      case "master":
        return "/master";
      default:
        return "/";
    }
  };

  const goToHome = () => {
    if (!user) return;
    router.push(getHomeForRole(user.role));
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 px-2 pr-2"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="h-7 w-7 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {initial}
            </div>
          )}
          <span className="hidden text-xs sm:inline truncate max-w-[120px]">
            {user.fullName ?? user.email ?? "Usuario"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {user.fullName ?? "Usuario"}
            </span>
            {user.email && (
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={goToHome}>
          <Home className="mr-2 h-4 w-4" />
          Ir a mi página
        </DropdownMenuItem>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
