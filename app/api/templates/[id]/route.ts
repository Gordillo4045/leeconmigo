import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: textId } = await context.params;
    if (!textId) {
      return NextResponse.json({ error: "Missing text id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, userId);
    if (!profile || profile.role !== "maestro") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: text, error: textError } = await supabase
      .from("texts")
      .select("id, title, topic, content, grade_id, difficulty")
      .eq("id", textId)
      .single();

    if (textError || !text) {
      return NextResponse.json(
        { error: "Text not found", message: textError?.message ?? "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id")
      .eq("text_id", textId)
      .limit(1);

    const quizId = quizzes?.[0]?.id ?? null;
    let questions: Array<{
      question_id: string;
      prompt: string;
      order_index: number;
      options: Array<{ option_text: string; is_correct: boolean }>;
    }> = [];

    if (quizId) {
      const { data: questionRows, error: qError } = await supabase
        .from("quiz_questions")
        .select("id, prompt, order_index")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (!qError && questionRows?.length) {
        const qIds = questionRows.map((q) => q.id);
        const { data: optionRows } = await supabase
          .from("quiz_options")
          .select("question_id, option_text, is_correct, order_index")
          .in("question_id", qIds)
          .order("order_index", { ascending: true });

        const optionsByQ = new Map<string, Array<{ option_text: string; is_correct: boolean }>>();
        for (const o of optionRows ?? []) {
          const qId = o.question_id as string;
          if (!optionsByQ.has(qId)) optionsByQ.set(qId, []);
          optionsByQ.get(qId)!.push({
            option_text: (o.option_text as string) ?? "",
            is_correct: (o.is_correct as boolean) ?? false,
          });
        }

        questions = questionRows.map((q) => ({
          question_id: q.id,
          prompt: (q.prompt as string) ?? "",
          order_index: (q.order_index as number) ?? 0,
          options: optionsByQ.get(q.id) ?? [],
        }));
      }
    }

    return NextResponse.json({
      ok: true,
      text: {
        id: text.id,
        title: (text.title as string) ?? "",
        topic: (text.topic as string) ?? "",
        content: (text.content as string) ?? "",
        grade_id: text.grade_id,
        difficulty: (text.difficulty as string) ?? "",
      },
      questions,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
