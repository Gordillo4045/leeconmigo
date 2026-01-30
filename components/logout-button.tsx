"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type UserInfo = {
  email: string | null;
  avatarUrl: string | null;
};

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUser({
        email: user.email ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      });
    };

    loadUser();
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const initial =
    user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt="User avatar"
          className="h-8 w-8 rounded-full"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {initial}
        </div>
      )}

      {/* Email */}
      {user?.email && (
        <span className="hidden text-sm text-muted-foreground sm:block">
          {user.email}
        </span>
      )}

      {/* Logout */}
      <Button variant="outline" onClick={logout}>
        Logout
      </Button>
    </div>
  );
}
