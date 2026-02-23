import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

async function TutorAuthGuard({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as any;
  const userId = claims?.sub;

  if (!userId) redirect("/auth/login");

  const profile = await getProfileByUserId(supabase, userId);
  if (!profile || profile.role !== "tutor") {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}

export default function TutorLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TutorAuthGuard>{children}</TutorAuthGuard>
    </Suspense>
  );
}
