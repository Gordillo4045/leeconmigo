import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";
import { getNav } from "@/components/dashboard/nav";
import { DashboardShell } from "@/components/dashboard/shell";

async function AdminLayoutGuard({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/auth/login");

  const profile = await getProfileByUserId(supabase, userId);
  if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
    redirect("/unauthorized");
  }

  const nav = getNav(profile.role);

  return (
    <DashboardShell
      title={profile.role === "master" ? "Master" : "Admin"}
      nav={nav}
      email={profile.email ?? ""}
      fullName={profile.full_name}
    >
      {children}
    </DashboardShell>
  );
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutGuard>{children}</AdminLayoutGuard>
    </Suspense>
  );
}
