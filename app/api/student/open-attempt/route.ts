import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  code: z.string().min(4).max(32),
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

    const code = parsed.data.code.trim().toUpperCase();
    const codeHashHex = createHash("md5").update(code).digest("hex");

    const admin = createAdminClient();

    // Buscar por code_hex (sin depender de RPC ni de auth)
    const { data: codeRow, error: codeError } = await admin
      .from("attempt_access_codes")
      .select("attempt_id, expires_at")
      .eq("code_hex", codeHashHex)
      .is("revoked_at", null)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      return NextResponse.json(
        { error: "DB error", message: codeError.message },
        { status: 500 }
      );
    }

    if (!codeRow || !codeRow.attempt_id) {
      // Fallback: intentar con RPC (admin client ignora RLS)
      const { data: rpcData, error: rpcError } = await admin.rpc("student_open_attempt", {
        p_code: parsed.data.code.trim(),
      });
      if (!rpcError && rpcData && rpcData.text?.content != null && Array.isArray(rpcData.questions)) {
        return NextResponse.json(
          { ok: true, result: rpcData },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "Pragma": "no-cache",
            },
          }
        );
      }
      return NextResponse.json(
        { error: "Code not found", message: "Code not found" },
        { status: 404 }
      );
    }

    const expiresAt = codeRow.expires_at as string;
    if (new Date(expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: "Code expired", message: "Code expired" },
        { status: 410 }
      );
    }

    const attemptId = codeRow.attempt_id as string;

    const { data: attempt, error: attemptError } = await admin
      .from("evaluation_attempts")
      .select("id, session_id")
      .eq("id", attemptId)
      .is("deleted_at", null)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Attempt not found", message: attemptError?.message ?? "Attempt not found" },
        { status: 404 }
      );
    }

    const { data: session, error: sessionError } = await admin
      .from("evaluation_sessions")
      .select("text_id, quiz_id")
      .eq("id", attempt.session_id)
      .is("deleted_at", null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found", message: sessionError?.message ?? "Session not found" },
        { status: 404 }
      );
    }

    const textId = session.text_id as string;
    const quizId = session.quiz_id as string;

    const { data: text, error: textError } = await admin
      .from("texts")
      .select("title, content, topic, grade_id, difficulty")
      .eq("id", textId)
      .single();

    if (textError || !text || text.content == null) {
      return NextResponse.json(
        { error: "Text not found", message: textError?.message ?? "Text not found for this session" },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await admin
      .from("quiz_questions")
      .select("id, prompt, order_index")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: "Questions error", message: questionsError.message },
        { status: 500 }
      );
    }

    const questionIds = (questions ?? []).map((q) => q.id);
    const { data: options } = await admin
      .from("quiz_options")
      .select("id, question_id, option_text, order_index")
      .in("question_id", questionIds)
      .order("order_index", { ascending: true });

    const optionsByQuestion = new Map<string, Array<{ option_id: string; text: string }>>();
    for (const o of options ?? []) {
      const qId = o.question_id as string;
      if (!optionsByQuestion.has(qId)) optionsByQuestion.set(qId, []);
      optionsByQuestion.get(qId)!.push({
        option_id: o.id,
        text: (o.option_text as string) ?? "",
      });
    }

    const questionsPayload = (questions ?? []).map((q) => ({
      question_id: q.id,
      q: (q.prompt as string) ?? "",
      options: optionsByQuestion.get(q.id) ?? [],
    }));

    const result = {
      attempt_id: attempt.id,
      session_id: attempt.session_id,
      expires_at: expiresAt,
      text: {
        title: (text.title as string) ?? "",
        topic: (text.topic as string) ?? "",
        grade: (text.grade_id as number) ?? 0,
        difficulty: (text.difficulty as string) ?? "",
        content: (text.content as string) ?? "",
      },
      questions: questionsPayload,
    };

    return NextResponse.json(
      { ok: true, result },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: "Server error",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
