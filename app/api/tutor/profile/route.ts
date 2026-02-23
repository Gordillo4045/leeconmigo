import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "tutor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const child_name = typeof body.child_name === "string" ? body.child_name.trim() : null;
    const child_grade =
      typeof body.child_grade === "number" && [1, 2, 3].includes(body.child_grade)
        ? body.child_grade
        : null;

    if (!child_name) {
      return NextResponse.json({ error: "child_name es requerido" }, { status: 400 });
    }
    if (!child_grade) {
      return NextResponse.json({ error: "child_grade debe ser 1, 2 o 3" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: updateErr } = await admin
      .from("profiles")
      .update({ child_name, child_grade })
      .eq("id", user.id)
      .eq("role", "tutor");

    if (updateErr) {
      return NextResponse.json(
        { error: "No se pudo actualizar el perfil", message: updateErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
