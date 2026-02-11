import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Crea un salón. Solo admin o master. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const gradeId = typeof body?.grade_id === "number" ? body.grade_id : null;
    const institutionId = body?.institution_id ?? profile.institution_id;

    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!gradeId || gradeId < 1 || gradeId > 3) {
      return NextResponse.json({ error: "grade_id debe ser 1, 2 o 3" }, { status: 400 });
    }
    if (!institutionId) {
      return NextResponse.json(
        { error: "Falta institution_id (admin debe tener institución; master debe enviarlo)" },
        { status: 400 }
      );
    }

    if (profile.role === "admin" && profile.institution_id !== institutionId) {
      return NextResponse.json({ error: "No puedes crear salones en otra institución" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("classrooms")
      .insert({
        institution_id: institutionId,
        name,
        grade_id: gradeId,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, name, grade_id, institution_id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe un salón con ese nombre en esta institución" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Error al crear salón", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ classroom: data }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
