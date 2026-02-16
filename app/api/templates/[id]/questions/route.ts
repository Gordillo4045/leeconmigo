import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const bodySchema = z.object({
  prompt: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answer_index: z.number().int().min(0).max(3),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
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

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, options, answer_index } = parsed.data;
    const admin = createAdminClient();

    const { data: text, error: textErr } = await admin
      .from("texts")
      .select("id, institution_id, grade_id")
      .eq("id", textId)
      .is("deleted_at", null)
      .single();

    if (textErr || !text) {
      return NextResponse.json(
        { error: "Text not found", message: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    if (profile.role !== "master" && profile.institution_id !== text.institution_id) {
      return NextResponse.json(
        { error: "No puedes editar una plantilla de otra institución" },
        { status: 403 }
      );
    }

    let quizId: string | null = null;
    const { data: quizRow } = await admin
      .from("quizzes")
      .select("id, question_count")
      .eq("text_id", textId)
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (quizRow) {
      if ((quizRow.question_count as number) >= 8) {
        return NextResponse.json(
          { error: "Máximo 8 preguntas por plantilla" },
          { status: 400 }
        );
      }
      quizId = quizRow.id as string;
    } else {
      const { data: newQuiz, error: insertQuizErr } = await admin
        .from("quizzes")
        .insert({
          institution_id: text.institution_id,
          text_id: textId,
          grade_id: text.grade_id,
          question_count: 0,
          created_by: userId,
        })
        .select("id")
        .single();
      if (insertQuizErr || !newQuiz) {
        return NextResponse.json(
          { error: "Error al crear quiz", message: insertQuizErr?.message },
          { status: 500 }
        );
      }
      quizId = newQuiz.id as string;
    }

    const { data: maxOrder } = await admin
      .from("quiz_questions")
      .select("order_index")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const orderIndex = (maxOrder?.order_index as number) ?? 0;

    const { data: newQuestion, error: qErr } = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: quizId,
        prompt,
        order_index: orderIndex + 1,
        created_by: userId,
      })
      .select("id")
      .single();

    if (qErr || !newQuestion) {
      return NextResponse.json(
        { error: "Error al crear pregunta", message: qErr?.message },
        { status: 500 }
      );
    }

    const questionId = newQuestion.id as string;
    for (let i = 0; i < 4; i++) {
      await admin.from("quiz_options").insert({
        question_id: questionId,
        option_text: options[i] ?? "",
        order_index: i + 1,
        is_correct: i === answer_index,
        created_by: userId,
      });
    }

    const { data: quiz } = await admin
      .from("quizzes")
      .select("question_count")
      .eq("id", quizId)
      .single();
    const newCount = ((quiz?.question_count as number) ?? 0) + 1;
    await admin.from("quizzes").update({ question_count: newCount, updated_by: userId }).eq("id", quizId);

    return NextResponse.json({
      ok: true,
      question_id: questionId,
      order_index: orderIndex + 1,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
