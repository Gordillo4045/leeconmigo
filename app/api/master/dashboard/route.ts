import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "master") {
      return NextResponse.json({ error: "Solo master" }, { status: 403 });
    }

    const admin = createAdminClient();

    const [
      institutionsResult,
      classroomsResult,
      studentsResult,
      activeSessionsResult,
      submittedAttemptsResult,
      profilesResult,
    ] = await Promise.all([
      admin
        .from("institutions")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
      admin
        .from("classrooms")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
      admin
        .from("students")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
      admin
        .from("evaluation_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "open")
        .is("deleted_at", null),
      admin
        .from("evaluation_attempts")
        .select("*", { count: "exact", head: true })
        .eq("status", "submitted")
        .is("deleted_at", null),
      admin.from("profiles").select("role"),
    ]);

    const roleCounts = { admin: 0, maestro: 0, tutor: 0, master: 0 };
    for (const p of profilesResult.data ?? []) {
      const r = p.role as keyof typeof roleCounts;
      if (r in roleCounts) roleCounts[r]++;
    }

    return NextResponse.json({
      institutionsCount: institutionsResult.count ?? 0,
      classroomsCount: classroomsResult.count ?? 0,
      studentsCount: studentsResult.count ?? 0,
      activeSessionsCount: activeSessionsResult.count ?? 0,
      submittedAttemptsCount: submittedAttemptsResult.count ?? 0,
      roleCounts,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Error de servidor", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
