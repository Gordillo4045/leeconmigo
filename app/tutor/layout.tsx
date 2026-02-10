import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";
import { getNav } from "@/components/dashboard/nav";
import { SidebarLayout } from "@/components/dashboard/sidebar-layout";

async function TutorLayoutGuard({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as any;
  const userId = claims?.sub;

  if (!userId) redirect("/auth/login");

  const profile = await getProfileByUserId(supabase, userId);
  if (!profile || profile.role !== "tutor") {
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

export default function TutorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <TutorLayoutGuard>{children}</TutorLayoutGuard>
    </Suspense>
  );
}
