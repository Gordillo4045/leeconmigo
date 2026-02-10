import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

/** Lista intentos de una sesión (alumno + estado) para que el maestro vea y pueda regenerar códigos. */
export async function GET(
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

    const { data: attempts, error: attemptsError } = await admin
      .from("evaluation_attempts")
      .select(`
        id,
        student_id,
        status,
        students ( id, first_name, last_name, curp ),
        attempt_code_display ( code_plain )
      `)
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (attemptsError) {
      return NextResponse.json(
        { error: "Error al cargar intentos", message: attemptsError.message },
        { status: 500 }
      );
    }

    const list = (attempts ?? []).map((a: {
      id: string;
      student_id: string;
      status: string;
      students?: { first_name: string; last_name: string; curp: string } | null;
      attempt_code_display?: { code_plain: string }[] | { code_plain: string } | null;
    }) => {
      const display = Array.isArray(a.attempt_code_display) ? a.attempt_code_display[0] : a.attempt_code_display;
      return {
        attempt_id: a.id,
        student_id: a.student_id,
        status: a.status,
        student_name: a.students
          ? `${(a.students.last_name ?? "").trim()} ${(a.students.first_name ?? "").trim()}`.trim() || "—"
          : "—",
        curp: (a.students as { curp?: string } | null)?.curp ?? null,
        code: display?.code_plain ?? null,
      };
    });

    return NextResponse.json({ attempts: list }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
