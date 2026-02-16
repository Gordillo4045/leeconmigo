import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const inferenceAnswerEnum = z.enum(["verdadero", "falso", "indeterminado"]);

const bodySchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(3).max(80),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  grade: z.number().int().min(1).max(3),
  text: z.string().min(10),
  generation_params: z.record(z.string(), z.any()).optional(),
  institution_id: z.string().uuid().optional(),
  questions: z.array(
    z.object({
      q: z.string().min(1),
      options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
      answer_index: z.number().int().min(0).max(3),
    })
  ),
  inference_statements: z
    .array(
      z.object({
        statement: z.string().min(1),
        context_fragment: z.string(),
        correct_answer: inferenceAnswerEnum,
      })
    )
    .optional()
    .default([]),
  vocabulary_pairs: z
    .array(
      z.object({
        word: z.string().min(1),
        definition: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  sequence_items: z
    .array(
      z.object({
        text: z.string().min(1),
        correct_order: z.number().int().min(1),
      })
    )
    .optional()
    .default([]),
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

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const institutionId = payload.institution_id ?? profile.institution_id ?? null;

    if (!institutionId) {
      return NextResponse.json(
        { error: "institution_id required (master must send it)" },
        { status: 400 }
      );
    }

    // 1) Guardar texto + quiz + preguntas (RPC)
    const { data: rpcData, error: rpcError } = await supabase.rpc("save_generated_template", {
      p_grade_id: payload.grade,
      p_title: payload.title,
      p_topic: payload.topic,
      p_difficulty: payload.difficulty,
      p_content: payload.text,
      p_generation_params: payload.generation_params ?? {},
      p_questions: payload.questions,
      p_institution_id: institutionId,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: "RPC error", message: rpcError.message },
        { status: 500 }
      );
    }

    const result = (rpcData as Record<string, unknown>) ?? {};
    const textId = result.text_id as string | undefined;

    if (!textId) {
      return NextResponse.json(
        { ok: true, result: rpcData, message: "Template saved (text_id not returned; inference/vocabulary/sequence not saved)." },
        { status: 200 }
      );
    }

    // 2) Guardar inferencia, vocabulario y secuencias
    if (payload.inference_statements.length > 0) {
      const rows = payload.inference_statements.map((row, i) => ({
        text_id: textId,
        statement: row.statement,
        context_fragment: row.context_fragment ?? "",
        correct_answer: row.correct_answer,
        order_index: i + 1,
        created_by: userId,
      }));
      const { error: infErr } = await supabase.from("inference_statements").insert(rows);
      if (infErr) {
        return NextResponse.json(
          { error: "Error saving inference_statements", message: infErr.message },
          { status: 500 }
        );
      }
    }

    if (payload.vocabulary_pairs.length > 0) {
      const rows = payload.vocabulary_pairs.map((row, i) => ({
        text_id: textId,
        word: row.word,
        definition: row.definition,
        order_index: i + 1,
        created_by: userId,
      }));
      const { error: vocErr } = await supabase.from("vocabulary_pairs").insert(rows);
      if (vocErr) {
        return NextResponse.json(
          { error: "Error saving vocabulary_pairs", message: vocErr.message },
          { status: 500 }
        );
      }
    }

    if (payload.sequence_items.length > 0) {
      const rows = payload.sequence_items.map((row) => ({
        text_id: textId,
        text: row.text,
        correct_order: row.correct_order,
        created_by: userId,
      }));
      const { error: seqErr } = await supabase.from("sequence_items").insert(rows);
      if (seqErr) {
        return NextResponse.json(
          { error: "Error saving sequence_items", message: seqErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      result: { ...result, text_id: textId },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
