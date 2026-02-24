import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
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

    const result = data as {
      session_id?: string;
      classroom_id?: string;
      text_id?: string;
      quiz_id?: string;
      question_count?: number;
      expires_in_minutes?: number;
      codes?: Array<{ student_id: string; attempt_id: string; code: string }>;
    } | null;

    if (result?.codes && Array.isArray(result.codes) && result.codes.length > 0) {
      const studentIds = [...new Set(result.codes.map((c) => c.student_id))];
      const admin = createAdminClient();
      const { data: students } = await admin
        .from("students")
        .select("id, first_name, last_name")
        .in("id", studentIds)
        .is("deleted_at", null);

      const nameById = new Map<string, string>();
      for (const s of students ?? []) {
        const id = s.id as string;
        const first = (s.first_name as string) ?? "";
        const last = (s.last_name as string) ?? "";
        nameById.set(id, [last, first].filter(Boolean).join(", ") || id);
      }

      result.codes = result.codes.map((c) => ({
        ...c,
        student_name: nameById.get(c.student_id) ?? c.student_id,
      }));
    }

    return NextResponse.json({ result: result ?? data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
