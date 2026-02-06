import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";
import { getNav } from "@/components/dashboard/nav";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function TutorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const userId = user?.sub;

  if (!userId) redirect("/auth/login");

  const profile = await getProfileByUserId(supabase, userId);
  if (!profile || profile.role !== "tutor") {
    redirect("/unauthorized");
  }

  const nav = getNav(profile.role);

  return (
    <DashboardShell
      title="Tutor"
      nav={nav}
      email={profile.email ?? ""}
      fullName={profile.full_name}
    >
      {children}
    </DashboardShell>
  );
}
