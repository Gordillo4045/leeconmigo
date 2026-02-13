import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export default async function AdminGestionIndex() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getProfileByUserId(supabase, user.id);

  if (!profile || profile.role !== "admin") {
    redirect("/unauthorized");
  }

  // 🚨 Si no tiene institución asignada, no puede gestionar nada
  if (!profile.institution_id) {
    redirect("/admin");
  }

  // Siempre redirige a gestión con su institución
  redirect(`/admin/gestion?institution_id=${profile.institution_id}`);
}
