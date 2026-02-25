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

  if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
    redirect("/unauthorized");
  }

  // Master tiene su propio home; no debe quedar atrapado aquí
  if (profile.role === "master") {
    redirect("/master");
  }

  // Admin sin institución asignada: no puede gestionar nada aún
  if (!profile.institution_id) {
    redirect("/unauthorized");
  }

  // Siempre redirige a gestión con su institución
  redirect(`/admin/gestion?institution_id=${profile.institution_id}`);
}
