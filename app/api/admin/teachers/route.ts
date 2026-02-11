import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Lista los maestros (profiles con role maestro) de la institución del admin. */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institution_id") ?? profile.institution_id;
    if (!institutionId) {
      return NextResponse.json(
        { error: "Falta institution_id (admin) o no tiene institución asignada" },
        { status: 400 }
      );
    }

    if (profile.role === "admin" && profile.institution_id !== institutionId) {
      return NextResponse.json({ error: "No autorizado para esa institución" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("institution_id", institutionId)
      .eq("role", "maestro")
      .is("deleted_at", null)
      .order("full_name", { nullsFirst: false });

    if (error) {
      return NextResponse.json(
        { error: "Error al listar maestros", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      teachers: (data ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => ({
        id: p.id,
        full_name: p.full_name ?? "",
        email: p.email ?? "",
      })),
    }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
