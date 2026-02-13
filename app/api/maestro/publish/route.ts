import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "maestro") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const classroom_id = typeof body?.classroom_id === "string" ? body.classroom_id : "";
    const text_id = typeof body?.text_id === "string" ? body.text_id : "";
    const quiz_id = typeof body?.quiz_id === "string" ? body.quiz_id : "";
    const expires_in_minutes =
      typeof body?.expires_in_minutes === "number" ? body.expires_in_minutes : 60;

    if (!classroom_id || !text_id || !quiz_id) {
      return NextResponse.json(
        { error: "Faltan classroom_id, text_id, quiz_id" },
        { status: 400 }
      );
    }

    // Llama a la RPC (la RPC ya bloquea: maestro sin salón + mismatch de grado)
    const { data, error } = await supabase.rpc("publish_evaluation_session", {
      p_classroom_id: classroom_id,
      p_text_id: text_id,
      p_quiz_id: quiz_id,
      p_expires_in_minutes: expires_in_minutes,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Error al publicar" },
        { status: 400 }
      );
    }

    return NextResponse.json({ result: data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
