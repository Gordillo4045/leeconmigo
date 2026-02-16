import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

const bodySchema = z.object({
  text: z.string().min(1),
  correct_order: z.number().int().min(1),
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

    const { data: row, error: insertErr } = await admin
      .from("sequence_items")
      .insert({
        text_id: textId,
        text: parsed.data.text,
        correct_order: parsed.data.correct_order,
        created_by: userId,
      })
      .select("id, correct_order")
      .single();

    if (insertErr || !row) {
      return NextResponse.json(
        { error: "Error al crear evento", message: insertErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: row.id, correct_order: row.correct_order });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Server error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
