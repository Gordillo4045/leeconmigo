import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

type AttemptRow = {
  id: string;
  submitted_at: string | null;
  score_percent: number | null;
  correct_count: number | null;
  total_questions: number | null;
  reading_time_ms: number | null;
  evaluation_sessions?: {
    texts?: { title: string | null } | null;
  } | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await ctx.params;
    const cleanId = (studentId ?? "").trim();
    if (!cleanId) {
      return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Historial de intentos enviados por este alumno
    // Master: todos los intentos; maestro: solo los de sus sesiones
    let query = adminClient
      .from("evaluation_attempts")
      .select(
        `
        id,
        submitted_at,
        score_percent,
        correct_count,
        total_questions,
        reading_time_ms,
        evaluation_sessions!inner(
          teacher_profile_id,
          texts(title)
        )
      `,
      )
      .eq("student_id", cleanId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(20);

    if (profile.role !== "master") {
      query = query.eq("evaluation_sessions.teacher_profile_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Query error", message: error.message },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as AttemptRow[];

    return NextResponse.json(
      {
        student_id: cleanId,
        attempts: rows.map((r) => ({
          attempt_id: r.id,
          submitted_at: r.submitted_at,
          score_percent: r.score_percent,
          correct_count: r.correct_count,
          total_questions: r.total_questions,
          reading_time_ms: r.reading_time_ms,
          text_title: r.evaluation_sessions?.texts?.title ?? null,
        })),
      },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

