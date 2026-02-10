import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

/** Regenera el código de acceso de un intento. Revoca el anterior y devuelve el nuevo (solo visible esta vez). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string; attemptId: string }> }
) {
  try {
    const { sessionId, attemptId } = await params;
    if (!sessionId || !attemptId) {
      return NextResponse.json({ error: "Falta session_id o attempt_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "maestro") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: session, error: sessionError } = await admin
      .from("evaluation_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("teacher_profile_id", profile.id)
      .is("deleted_at", null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const { data: attempt, error: attemptError } = await admin
      .from("evaluation_attempts")
      .select("id")
      .eq("id", attemptId)
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
    }

    const newCode = randomCode(8);
    const { data: rpcData, error: rpcError } = await admin.rpc("regenerate_attempt_code", {
      p_attempt_id: attemptId,
      p_new_code_plain: newCode,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: "Error al regenerar código", message: rpcError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: (rpcData as { code?: string })?.code ?? newCode, expires_at: (rpcData as { expires_at?: string })?.expires_at },
      { status: 200 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
