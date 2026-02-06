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
  return difficulty === "facil" ? 4 : difficulty === "medio" ? 6 : 8;
}

function maxTokensFor(words: number) {
  if (words <= 120) return 520;
  if (words <= 180) return 680;
  return 820;
}

/* ==================== OUTPUT SCHEMA ==================== */
const outputSchema = {
  name: "reading_text_with_quiz",
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
    ],
    properties: {
      title: { type: "string" },
      topic: { type: "string" },
      difficulty: {
        type: "string",
        enum: ["facil", "medio", "dificil"],
      },
      grade: {
        type: "integer",
        minimum: 1,
        maximum: 3,
      },
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
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
            },
            answer_index: {
              type: "integer",
              minimum: 0,
              maximum: 3,
            },
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

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = [
      "Eres un generador de textos escolares en español neutro para primaria (1° a 3°).",
      "REGLAS DURAS:",
      "- Responde SOLO con JSON válido (sin texto extra).",
      "- El texto debe ser un solo bloque (sin listas).",
      `- Longitud objetivo: ${words} palabras (±10%).`,
      `- Dificultad: ${difficulty}.`,
      `- Grado: ${grade}.`,
      qCount > 0
        ? `- Genera EXACTAMENTE ${qCount} preguntas de opción múltiple, 4 opciones, 1 correcta, sin ambigüedad.`
        : "- No generes preguntas; questions debe ser un arreglo vacío.",
    ].join("\n");

    const userPrompt = [
      `Temática: ${topic}`,
      `Grado: ${grade}`,
      `Dificultad: ${difficulty}`,
      `Palabras objetivo: ${words}`,
      `Número de preguntas: ${qCount}`,
      "Devuelve un título corto apropiado para primaria.",
      "En questions: answer_index debe ser 0..3.",
      "word_count_estimate debe ser una estimación entera del total de palabras del campo text.",
    ].join("\n");

    const resp = await client.responses.create({
      model: "gpt-4.1-nano",
      temperature: 0.4,
      max_output_tokens: maxTokensFor(words),
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],

      // ✅ TU SERVIDOR PIDE text.format.schema (aplanado)
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

    // ✅ Parseo tolerante: intenta JSON directo, si falla extrae el primer objeto {...}
let result: any;
try {
  result = JSON.parse(outputText);
} catch {
  const start = outputText.indexOf("{");
  const end = outputText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return NextResponse.json(
      {
        error: "Model returned non-JSON output",
        sample: outputText.slice(0, 400),
      },
      { status: 502 }
    );
  }

  const candidate = outputText.slice(start, end + 1);

  try {
    result = JSON.parse(candidate);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Invalid JSON from model",
        message: e?.message ?? String(e),
        sample: candidate.slice(0, 600),
      },
      { status: 502 }
    );
  }
}

    // defensas finales
    if (!include_questions) result.questions = [];
    if (include_questions && Array.isArray(result.questions)) {
      result.questions = result.questions.slice(0, qCount);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
