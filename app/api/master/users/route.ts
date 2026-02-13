import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "master") {
      return NextResponse.json({ error: "Solo master" }, { status: 403 });
    }

    const admin = createAdminClient();

    let query = admin
      .from("profiles")
      .select("id, email, full_name, role, institution_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (q) {
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Error al listar usuarios", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: data ?? [] }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
