import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "master" | "admin" | "maestro" | "tutor";

export async function requireRole(allowed: AppRole[]) {
  const supabase = await createClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) redirect("/auth/login");

  const user = authData.user;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, role, institution_id, full_name, email")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) redirect("/unauthorized");

  if (!allowed.includes(profile.role)) redirect("/unauthorized");

  // email: preferimos el de profiles; fallback auth.user.email
  const email = profile.email ?? user.email ?? "";

  return {
    userId: user.id,
    role: profile.role as AppRole,
    institutionId: profile.institution_id as string | null,
    fullName: profile.full_name as string | null,
    email,
  };
}
