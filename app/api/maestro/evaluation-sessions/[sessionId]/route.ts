import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Falta session_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: session, error: fetchError } = await admin
      .from("evaluation_sessions")
      .select("id, teacher_profile_id, status")
      .eq("id", sessionId)
      .eq("teacher_profile_id", profile.id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    if (session.status === "closed") {
      return NextResponse.json({ error: "La sesión ya está cerrada" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("evaluation_sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { error: "Error al cerrar sesión", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Sesión cerrada" }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
