import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const bodySchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(3).max(80),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  grade: z.number().int().min(1).max(3),
  text: z.string().min(10),
  generation_params: z.record(z.string(), z.any()).optional(),

questions: z.array(
  z.object({
    q: z.string().min(1),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    answer_index: z.number().int().min(0).max(3),
  })
),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1) Auth
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Role check
    const profile = await getProfileByUserId(supabase, userId);
    if (!profile || !["maestro", "admin", "master"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 3) Validate body
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // 4) Call RPC
    const { data, error } = await supabase.rpc("save_generated_template", {
      p_grade_id: payload.grade,
      p_title: payload.title,
      p_topic: payload.topic,
      p_difficulty: payload.difficulty,
      p_content: payload.text,
      p_generation_params: payload.generation_params ?? {},
      p_questions: payload.questions,
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
