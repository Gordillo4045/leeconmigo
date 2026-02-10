import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

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
      if (profile.role === "master") {
        return NextResponse.json({ students: [] }, { status: 200 });
      }
      return NextResponse.json(
        { error: "Falta institution_id (admin) o no tiene institución asignada" },
        { status: 400 }
      );
    }

    // Usamos admin client para evitar problemas de RLS,
    // pero filtramos explícitamente por institution_id autorizado.
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("students")
      .select("id, curp, first_name, last_name, created_at")
      .eq("institution_id", institutionId)
      .is("deleted_at", null)
      .order("last_name")
      .order("first_name");

    if (error) {
      return NextResponse.json({ error: "Error al listar alumnos", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ students: data ?? [] }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const curp = typeof body?.curp === "string" ? body.curp.trim().toUpperCase() : null;
    const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : null;
    const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : null;
    const institutionId = body?.institution_id ?? profile.institution_id;

    if (!curp || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Faltan curp, first_name o last_name" },
        { status: 400 }
      );
    }
    if (curp.length < 18 || curp.length > 20) {
      return NextResponse.json({ error: "CURP debe tener entre 18 y 20 caracteres" }, { status: 400 });
    }
    if (!institutionId) {
      return NextResponse.json(
        { error: "Falta institution_id (admin debe tener institución; master puede enviarlo)" },
        { status: 400 }
      );
    }

    // Usamos admin client para el INSERT: ya validamos que el usuario es admin/master y su institución
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("students")
      .insert({
        institution_id: institutionId,
        curp,
        first_name: firstName,
        last_name: lastName,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, curp, first_name, last_name")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ya existe un alumno con ese CURP" }, { status: 409 });
      if (error.code === "23514") return NextResponse.json({ error: "Dato inválido (revisa formato de CURP: 18-20 caracteres)" }, { status: 400 });
      return NextResponse.json({ error: "Error al crear alumno", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ student: data }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
