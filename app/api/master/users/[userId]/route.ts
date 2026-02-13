import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const me = await getProfileByUserId(supabase, user.id);

    if (!me || me.role !== "master") {
      return NextResponse.json({ error: "Solo master" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const role = body?.role as string | undefined;
    const institution_id =
      body?.institution_id === null
        ? null
        : typeof body?.institution_id === "string"
          ? body.institution_id
          : undefined;

    const allowedRoles = ["master", "admin", "maestro", "tutor"];

    if (role !== undefined && !allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // 🔒 BLOQUEO CRÍTICO:
    // No permitas que el master se cambie su propio rol a algo distinto de "master".
    if (userId === user.id && role !== undefined && role !== "master") {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol de master." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const updates: { role?: string; institution_id?: string | null } = {};
    if (role !== undefined) updates.role = role;
    if (institution_id !== undefined) updates.institution_id = institution_id;

    const { data, error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, email, full_name, role, institution_id, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar usuario", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
