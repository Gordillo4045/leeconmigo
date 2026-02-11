import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Lista todas las instituciones. Solo master. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "master") {
      return NextResponse.json({ error: "Solo el rol master puede listar instituciones" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("institutions")
      .select("id, name, code, created_at")
      .is("deleted_at", null)
      .order("name");

    if (error) {
      return NextResponse.json(
        { error: "Error al listar instituciones", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ institutions: data ?? [] }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Crea una institución. Solo master. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "master") {
      return NextResponse.json({ error: "Solo el rol master puede crear instituciones" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() || null : null;

    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("institutions")
      .insert({
        name,
        code: code || null,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("id, name, code, created_at")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ya existe una institución con ese código" }, { status: 409 });
      return NextResponse.json(
        { error: "Error al crear institución", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ institution: data }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
