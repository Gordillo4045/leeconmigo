import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
