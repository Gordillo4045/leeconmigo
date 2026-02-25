import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || (profile.role !== "maestro" && profile.role !== "master")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    );
    const status = url.searchParams.get("status") ?? "";
    const classroomId = url.searchParams.get("classroom_id") ?? "";

    const admin = createAdminClient();

    let sessionsQuery = admin
      .from("evaluation_sessions")
      .select(
        `
        id,
        classroom_id,
        text_id,
        status,
        published_at,
        expires_at,
        closed_at,
        classrooms ( id, name, grade_id ),
        texts ( id, title )
      `,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("published_at", { ascending: false });

    // Maestro: filtrar solo sus sesiones; master ve todas
    if (profile.role !== "master") {
      sessionsQuery = sessionsQuery.eq("teacher_profile_id", profile.id);
    }

    const nowIso = new Date().toISOString();
    if (status === "open") {
      sessionsQuery = sessionsQuery.eq("status", "open").gt("expires_at", nowIso);
    } else if (status === "expired") {
      sessionsQuery = sessionsQuery.eq("status", "open").lt("expires_at", nowIso);
    } else if (status === "closed") {
      sessionsQuery = sessionsQuery.eq("status", "closed");
    }
    if (classroomId) {
      sessionsQuery = sessionsQuery.eq("classroom_id", classroomId);
    }

    const from = (page - 1) * pageSize;
    const { data: sessions, error: sessionsError, count } = await sessionsQuery.range(from, from + pageSize - 1);

    if (sessionsError) {
      return NextResponse.json(
        { error: "Error al listar sesiones", message: sessionsError.message },
        { status: 500 }
      );
    }

    const list = sessions ?? [];
    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (list.length === 0) {
      return NextResponse.json(
        { sessions: [], total, total_pages: totalPages, page, page_size: pageSize },
        { status: 200 }
      );
    }

    const sessionIds = list.map((s: { id: string }) => s.id);
    const { data: attempts, error: attemptsError } = await admin
      .from("evaluation_attempts")
      .select("id, session_id, status")
      .in("session_id", sessionIds)
      .is("deleted_at", null);

    if (attemptsError) {
      return NextResponse.json(
        { error: "Error al cargar intentos", message: attemptsError.message },
        { status: 500 }
      );
    }

    const bySession = new Map<
      string,
      { total: number; submitted: number; pending: number; expired: number; in_progress: number }
    >();
    for (const s of list) {
      bySession.set(s.id, { total: 0, submitted: 0, pending: 0, expired: 0, in_progress: 0 });
    }
    for (const a of attempts ?? []) {
      const key = a.session_id as string;
      const row = bySession.get(key);
      if (!row) continue;
      row.total += 1;
      if (a.status === "submitted") row.submitted += 1;
      else if (a.status === "pending" || a.status === "in_progress") {
        if (a.status === "in_progress") row.in_progress += 1;
        else row.pending += 1;
      } else if (a.status === "expired") row.expired += 1;
    }

    const now = new Date();
    const sessionsPayload = list.map(
      (s: {
        id: string;
        classroom_id: string;
        status: string;
        published_at: string;
        expires_at: string;
        closed_at: string | null;
        classrooms?: { id: string; name: string; grade_id: number } | null;
        texts?: { id: string; title: string | null } | null;
      }) => {
        const stats = bySession.get(s.id) ?? {
          total: 0,
          submitted: 0,
          pending: 0,
          expired: 0,
          in_progress: 0,
        };
        const expiresAt = s.expires_at ? new Date(s.expires_at) : null;
        const isExpired = expiresAt ? expiresAt <= now : false;
        const statusEffective = s.status === "open" && isExpired ? "expired" : s.status;
        let timeLeft: string | null = null;
        if (expiresAt && statusEffective === "open") {
          const ms = expiresAt.getTime() - now.getTime();
          if (ms > 0) {
            const min = Math.floor(ms / 60000);
            const h = Math.floor(min / 60);
            const m = min % 60;
            timeLeft = h > 0 ? `${h}h ${m}min` : `${m} min`;
          } else {
            timeLeft = "Expirada";
          }
        } else if (s.closed_at) {
          timeLeft = "Cerrada";
        }

        return {
          id: s.id,
          classroom_id: s.classroom_id,
          classroom_name: (s.classrooms as { name: string } | null)?.name ?? "—",
          grade_id: (s.classrooms as { grade_id: number } | null)?.grade_id ?? null,
          text_title: (s.texts as { title: string | null } | null)?.title ?? "—",
          status: statusEffective,
          published_at: s.published_at,
          expires_at: s.expires_at,
          closed_at: s.closed_at,
          time_left: timeLeft,
          total_attempts: stats.total,
          submitted_count: stats.submitted,
          pending_count: stats.pending + stats.in_progress,
          expired_count: stats.expired,
        };
      }
    );

    return NextResponse.json(
      {
        sessions: sessionsPayload,
        total,
        total_pages: totalPages,
        page,
        page_size: pageSize,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
