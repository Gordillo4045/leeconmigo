import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";
import { getNav } from "@/components/dashboard/nav";
import { DashboardShell } from "@/components/dashboard/shell";

async function MasterLayoutGuard({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const userId = user?.sub;

  if (!userId) redirect("/auth/login");

  const profile = await getProfileByUserId(supabase, userId);
  if (!profile || profile.role !== "master") {
    redirect("/unauthorized");
  }

  const nav = getNav(profile.role);

  return (
    <DashboardShell
      title="Master"
      nav={nav}
      email={profile.email ?? ""}
      fullName={profile.full_name}
    >
      {children}
    </DashboardShell>
  );
}

export default function MasterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <MasterLayoutGuard>{children}</MasterLayoutGuard>
    </Suspense>
  );
}
