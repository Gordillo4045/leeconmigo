import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  attempt_id: z.string().uuid(),
  reading_time_ms: z.number().int().min(0),
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        option_id: z.string().uuid(),
      })
    )
    .min(3)
    .max(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Cliente admin: el alumno no tiene sesión; el attempt_id viene del open-attempt previo
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("student_submit_attempt", {
      p_attempt_id: parsed.data.attempt_id,
      p_reading_time_ms: parsed.data.reading_time_ms,
      p_answers: parsed.data.answers,
    });

    if (error) {
      return NextResponse.json(
        { error: "RPC error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
