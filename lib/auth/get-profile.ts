import { createClient } from "@/lib/supabase/client";

export async function getMyProfile() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, institution_id, full_name, email")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("getMyProfile error:", error.message);
    return null;
  }

  return data;
}
