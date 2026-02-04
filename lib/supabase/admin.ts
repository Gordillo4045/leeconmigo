import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con service role. Solo usar en el servidor.
 * Ignora RLS. NO exponer SUPABASE_SERVICE_ROLE_KEY al cliente.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Devuelve el cliente admin si existe la key; si no, null (para usos opcionales en layouts). */
export function getAdminClientSafe(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }
  return createAdminClient();
}
