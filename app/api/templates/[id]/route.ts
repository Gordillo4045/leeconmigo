import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    if (!profile || !["maestro", "master", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: text, error: textError } = await supabase
      .from("texts")
      .select("id, title, topic, content, grade_id, difficulty, institution_id")
      .eq("id", textId)
      .is("deleted_at", null)
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

    const { data: inferenceRows } = await supabase
      .from("inference_statements")
      .select("id, statement, context_fragment, correct_answer, order_index")
      .eq("text_id", textId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });

    const inference_statements = (inferenceRows ?? []).map((r) => ({
      id: r.id,
      statement: (r.statement as string) ?? "",
      context_fragment: (r.context_fragment as string) ?? "",
      correct_answer: (r.correct_answer as string) ?? "indeterminado",
      order_index: (r.order_index as number) ?? 0,
    }));

    const { data: vocabularyRows } = await supabase
      .from("vocabulary_pairs")
      .select("id, word, definition, order_index")
      .eq("text_id", textId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });

    const vocabulary_pairs = (vocabularyRows ?? []).map((r) => ({
      id: r.id,
      word: (r.word as string) ?? "",
      definition: (r.definition as string) ?? "",
      order_index: (r.order_index as number) ?? 0,
    }));

    const { data: sequenceRows } = await supabase
      .from("sequence_items")
      .select("id, text, correct_order")
      .eq("text_id", textId)
      .is("deleted_at", null)
      .order("correct_order", { ascending: true });

    const sequence_items = (sequenceRows ?? []).map((r) => ({
      id: r.id,
      text: (r.text as string) ?? "",
      correct_order: (r.correct_order as number) ?? 0,
    }));

    return NextResponse.json({
      ok: true,
      quiz_id: quizId,
      text: {
        id: text.id,
        title: (text.title as string) ?? "",
        topic: (text.topic as string) ?? "",
        content: (text.content as string) ?? "",
        grade_id: text.grade_id,
        difficulty: (text.difficulty as string) ?? "",
      },
      questions,
      inference_statements,
      vocabulary_pairs,
      sequence_items,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    if (!profile || !["maestro", "master", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: text, error: fetchErr } = await supabase
      .from("texts")
      .select("id, institution_id")
      .eq("id", textId)
      .single();

    if (fetchErr || !text) {
      return NextResponse.json(
        { error: "Text not found", message: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    if (profile.role !== "master" && profile.institution_id !== text.institution_id) {
      return NextResponse.json({ error: "No puedes eliminar una plantilla de otra institución" }, { status: 403 });
    }

    // Maestros no tienen UPDATE en texts por RLS; usamos admin para el soft-delete tras validar arriba
    const admin = createAdminClient();
    const { error: updateErr } = await admin
      .from("texts")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", textId);

    if (updateErr) {
      return NextResponse.json(
        { error: "Update failed", message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Plantilla eliminada" }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
