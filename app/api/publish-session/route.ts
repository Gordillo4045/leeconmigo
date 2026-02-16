import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const bodySchema = z.object({
  classroom_id: z.string().uuid(),
  text_id: z.string().uuid(),
  quiz_id: z.string().uuid(),
  expires_in_minutes: z.number().int().min(1).max(240).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, userId);
    if (!profile || !["maestro", "admin", "master"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { classroom_id, text_id, quiz_id, expires_in_minutes } = parsed.data;

    const { data, error } = await supabase.rpc("publish_evaluation_session", {
      p_classroom_id: classroom_id,
      p_text_id: text_id,
      p_quiz_id: quiz_id,
      p_expires_in_minutes: expires_in_minutes ?? 60,
    });

    if (error) {
      return NextResponse.json(
        { error: "RPC error", message: error.message },
        { status: 500 }
      );
    }

    const result = data as {
      session_id?: string;
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

    return NextResponse.json({ ok: true, result: result ?? data }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
