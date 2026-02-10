import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";
import { getNav } from "@/components/dashboard/nav";
import { SidebarLayout } from "@/components/dashboard/sidebar-layout";

async function MaestroLayoutGuard({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as any;
  const userId = claims?.sub;

  if (!userId) redirect("/auth/login");

  const profile = await getProfileByUserId(supabase, userId);
  if (!profile || profile.role !== "maestro") {
    redirect("/unauthorized");
  }

  const nav = getNav(profile.role);

  const avatarUrl =
    claims?.user_metadata?.avatar_url ??
    claims?.user_metadata?.picture ??
    claims?.avatar_url ??
    claims?.picture ??
    null;

  return (
    <SidebarLayout
      nav={nav}
      role={profile.role}
      email={profile.email ?? ""}
      fullName={profile.full_name}
      avatarUrl={avatarUrl}
    >
      {children}
    </SidebarLayout>
  );
}

export default function MaestroLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <MaestroLayoutGuard>{children}</MaestroLayoutGuard>
    </Suspense>
  );
}
