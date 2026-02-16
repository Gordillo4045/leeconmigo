import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const bodySchema = z.object({
  word: z.string().min(1),
  definition: z.string().min(1),
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

    const admin = createAdminClient();
    const { data: text, error: textErr } = await admin
      .from("texts")
      .select("id, institution_id")
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

    const { data: maxOrder } = await admin
      .from("vocabulary_pairs")
      .select("order_index")
      .eq("text_id", textId)
      .is("deleted_at", null)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const orderIndex = ((maxOrder?.order_index as number) ?? 0) + 1;

    const { data: row, error: insertErr } = await admin
      .from("vocabulary_pairs")
      .insert({
        text_id: textId,
        word: parsed.data.word,
        definition: parsed.data.definition,
        order_index: orderIndex,
        created_by: userId,
      })
      .select("id, order_index")
      .single();

    if (insertErr || !row) {
      return NextResponse.json(
        { error: "Error al crear par", message: insertErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: row.id, order_index: row.order_index });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
