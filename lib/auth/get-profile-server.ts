import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientSafe } from "@/lib/supabase/admin";
import { USER_ROLES, type UserRole } from "./roles";
import type { ServerProfile } from "./types";

export async function getProfileByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<ServerProfile | null> {
  const client = getAdminClientSafe() ?? supabase;

  const { data, error } = await client
    .from("profiles")
    .select("id, role, email, full_name, institution_id")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  if (!USER_ROLES.includes(data.role as UserRole)) return null;

  return {
    id: data.id,
    role: data.role as UserRole,
    email: data.email ?? null,
    full_name: data.full_name ?? null,
    institution_id: data.institution_id ?? null,
  };
}
