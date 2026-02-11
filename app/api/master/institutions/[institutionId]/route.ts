import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Actualiza una institución. Solo master. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { institutionId } = await params;
    if (!institutionId) return NextResponse.json({ error: "Falta institution_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "master") {
      return NextResponse.json({ error: "Solo el rol master puede editar instituciones" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const code = body?.code !== undefined ? (typeof body.code === "string" ? body.code.trim() || null : null) : undefined;

    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const admin = createAdminClient();

    const updates: { name?: string; code?: string | null; updated_by?: string } = { updated_by: profile.id };
    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code;

    const { data, error } = await admin
      .from("institutions")
      .update(updates)
      .eq("id", institutionId)
      .is("deleted_at", null)
      .select("id, name, code, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ya existe una institución con ese código" }, { status: 409 });
      if (error.code === "PGRST116") return NextResponse.json({ error: "Institución no encontrada" }, { status: 404 });
      return NextResponse.json(
        { error: "Error al actualizar", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ institution: data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
