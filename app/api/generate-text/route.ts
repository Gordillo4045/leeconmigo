import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

/* ==================== INPUT VALIDATION ==================== */
const inputSchema = z.object({
  topic: z.string().min(3).max(80),
  words: z.number().int().min(60).max(220),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  grade: z.number().int().min(1).max(3),
  include_questions: z.boolean(),
});

function questionsFor(difficulty: "facil" | "medio" | "dificil") {
  return difficulty === "facil" ? 4 : difficulty === "medio" ? 5 : 6;
}

function inferenceCount(difficulty: string) {
  return difficulty === "facil" ? 3 : difficulty === "medio" ? 4 : 5;
}

function vocabularyCount(difficulty: string) {
  return difficulty === "facil" ? 4 : difficulty === "medio" ? 5 : 6;
}

function sequenceCount(difficulty: string) {
  return difficulty === "facil" ? 4 : difficulty === "medio" ? 5 : 6;
}

function maxTokensFor(words: number) {
  if (words <= 120) return 2400;
  if (words <= 180) return 2800;
  return 3200;
}

/* ==================== OUTPUT SCHEMA (5 actividades) ==================== */
const outputSchema = {
  name: "reading_text_full_evaluation",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "topic",
      "difficulty",
      "grade",
      "word_count_estimate",
      "text",
      "questions",
      "inference_statements",
      "vocabulary_pairs",
      "sequence_items",
    ],
    properties: {
      title: { type: "string" },
      topic: { type: "string" },
      difficulty: { type: "string", enum: ["facil", "medio", "dificil"] },
      grade: { type: "integer", minimum: 1, maximum: 3 },
      word_count_estimate: { type: "integer" },
      text: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["q", "options", "answer_index"],
          properties: {
            q: { type: "string" },
            options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
            answer_index: { type: "integer", minimum: 0, maximum: 3 },
          },
        },
      },
      inference_statements: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["statement", "context_fragment", "correct_answer"],
          properties: {
            statement: { type: "string" },
            context_fragment: { type: "string" },
            correct_answer: { type: "string", enum: ["verdadero", "falso", "indeterminado"] },
          },
        },
      },
      vocabulary_pairs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["word", "definition"],
          properties: {
            word: { type: "string" },
            definition: { type: "string" },
          },
        },
      },
      sequence_items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["text", "correct_order"],
          properties: {
            text: { type: "string" },
            correct_order: { type: "integer", minimum: 1 },
          },
        },
      },
    },
  },
} as const;

/* ==================== HANDLER ==================== */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = inputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, words, difficulty, grade, include_questions } = parsed.data;
    const qCount = include_questions ? questionsFor(difficulty) : 0;
    const infCount = include_questions ? inferenceCount(difficulty) : 0;
    const vocCount = include_questions ? vocabularyCount(difficulty) : 0;
    const seqCount = include_questions ? sequenceCount(difficulty) : 0;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = [
      "Eres un generador de textos escolares en español neutro para primaria (1° a 3°).",
      "REGLAS DURAS: Responde SOLO con JSON válido (sin texto extra). El texto debe ser un solo bloque (sin listas).",
      `Longitud objetivo: ${words} palabras (±10%). Dificultad: ${difficulty}. Grado: ${grade}.`,
      include_questions
        ? [
            `Genera EXACTAMENTE ${qCount} preguntas de COMPRENSIÓN (opción múltiple, 4 opciones, 1 correcta).`,
            `Genera EXACTAMENTE ${infCount} afirmaciones de INFERENCIA: cada una con statement (afirmación sobre el texto), context_fragment (cita breve del texto que apoya o refuta), correct_answer: "verdadero", "falso" o "indeterminado".`,
            `Genera EXACTAMENTE ${vocCount} pares de VOCABULARIO: word (palabra del texto) y definition (significado adecuado para primaria).`,
            `Genera EXACTAMENTE ${seqCount} eventos de SECUENCIA: text (oración que describe un evento del cuento en orden cronológico), correct_order (1, 2, 3...). Orden lógico del relato.`,
          ].join(" ")
        : "No generes actividades; questions, inference_statements, vocabulary_pairs y sequence_items deben ser arreglos vacíos.",
    ].join("\n");

    const userPrompt = [
      `Temática: ${topic}. Grado: ${grade}. Dificultad: ${difficulty}. Palabras: ${words}.`,
      "Devuelve: title, topic, difficulty, grade, word_count_estimate, text,",
      "questions (preguntas de comprensión con q, options[4], answer_index 0-3),",
      "inference_statements (statement, context_fragment, correct_answer: verdadero|falso|indeterminado),",
      "vocabulary_pairs (word, definition),",
      "sequence_items (text, correct_order desde 1).",
    ].join(" ");

    const resp = await client.responses.create({
      model: "gpt-4.1-nano",
      temperature: 0.4,
      max_output_tokens: maxTokensFor(words),
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: outputSchema.name,
          strict: true,
          schema: outputSchema.schema,
        },
      } as any,
    } as any);

    const outputText = (resp as any).output_text as string | undefined;

    if (!outputText) {
      return NextResponse.json(
        { error: "No output_text returned by model" },
        { status: 502 }
      );
    }

    let result: any;
    try {
      result = JSON.parse(outputText);
    } catch {
      const start = outputText.indexOf("{");
      const end = outputText.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) {
        return NextResponse.json(
          { error: "Model returned non-JSON output", sample: outputText.slice(0, 400) },
          { status: 502 }
        );
      }
      try {
        result = JSON.parse(outputText.slice(start, end + 1));
      } catch (e: unknown) {
        return NextResponse.json(
          {
            error: "Invalid JSON from model",
            message: e instanceof Error ? e.message : String(e),
            sample: outputText.slice(start, start + 600),
          },
          { status: 502 }
        );
      }
    }

    if (!include_questions) {
      result.questions = [];
      result.inference_statements = [];
      result.vocabulary_pairs = [];
      result.sequence_items = [];
    } else {
      if (Array.isArray(result.questions)) result.questions = result.questions.slice(0, qCount);
      if (Array.isArray(result.inference_statements)) result.inference_statements = result.inference_statements.slice(0, infCount);
      if (Array.isArray(result.vocabulary_pairs)) result.vocabulary_pairs = result.vocabulary_pairs.slice(0, vocCount);
      if (Array.isArray(result.sequence_items)) {
        result.sequence_items = result.sequence_items.slice(0, seqCount);
        result.sequence_items.forEach((item: { correct_order?: number }, i: number) => {
          item.correct_order = i + 1;
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
