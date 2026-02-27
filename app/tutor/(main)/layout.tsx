import { ReactNode, Suspense } from "react";
import { getNav } from "@/components/dashboard/nav";
import { SidebarLayout } from "@/components/dashboard/sidebar-layout";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

async function TutorSidebarGuard({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as any;
  const userId = claims?.sub;

  const profile = userId ? await getProfileByUserId(supabase, userId) : null;

  const nav = getNav("tutor");

  const avatarUrl =
    claims?.user_metadata?.avatar_url ??
    claims?.user_metadata?.picture ??
    claims?.avatar_url ??
    claims?.picture ??
    null;

  return (
    <SidebarLayout
      nav={nav}
      role="tutor"
      email={profile?.email ?? ""}
      fullName={profile?.full_name ?? null}
      avatarUrl={avatarUrl}
    >
      {children}
    </SidebarLayout>
  );
}

export default function TutorMainLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TutorSidebarGuard>{children}</TutorSidebarGuard>
    </Suspense>
  );
}
