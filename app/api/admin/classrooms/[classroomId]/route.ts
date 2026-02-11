import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Actualiza un salón. Solo admin o master de la institución. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    if (!classroomId) return NextResponse.json({ error: "Falta classroom_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const gradeId = typeof body?.grade_id === "number" ? body.grade_id : undefined;

    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    if (gradeId !== undefined && (gradeId < 1 || gradeId > 3)) {
      return NextResponse.json({ error: "grade_id debe ser 1, 2 o 3" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("classrooms")
      .select("id, institution_id")
      .eq("id", classroomId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Salón no encontrado" }, { status: 404 });
    }

    if (profile.role === "admin" && profile.institution_id !== existing.institution_id) {
      return NextResponse.json({ error: "No autorizado para este salón" }, { status: 403 });
    }

    const updates: { name?: string; grade_id?: number; updated_by?: string } = { updated_by: user.id };
    if (name !== undefined) updates.name = name;
    if (gradeId !== undefined) updates.grade_id = gradeId;

    const { data, error } = await admin
      .from("classrooms")
      .update(updates)
      .eq("id", classroomId)
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
        { error: "Error al actualizar", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ classroom: data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Elimina (soft delete) un salón. Solo admin o master de la institución. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    if (!classroomId) return NextResponse.json({ error: "Falta classroom_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "admin" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("classrooms")
      .select("id, institution_id")
      .eq("id", classroomId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Salón no encontrado" }, { status: 404 });
    }

    if (profile.role === "admin" && profile.institution_id !== existing.institution_id) {
      return NextResponse.json({ error: "No autorizado para este salón" }, { status: 403 });
    }

    const { error } = await admin
      .from("classrooms")
      .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
      .eq("id", classroomId);

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
