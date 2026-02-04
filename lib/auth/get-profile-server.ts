import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientSafe } from "@/lib/supabase/admin";

export type ProfileRole = "tutor" | "maestro" | "admin" | "master";

/**
 * Obtiene el perfil (rol) por user id en el servidor.
 * Usa admin (service role) si SUPABASE_SERVICE_ROLE_KEY está configurada;
 * si no, usa el cliente con sesión (requiere RLS: SELECT en profiles donde id = auth.uid()).
 */
export async function getProfileByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<{ role: ProfileRole } | null> {
  const client = getAdminClientSafe() ?? supabase;
  const { data } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data as { role: ProfileRole } | null;
}
