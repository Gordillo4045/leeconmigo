import { NextResponse } from "next/server";
import { z } from "zod";
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

    // Cliente admin (service role): el alumno no tiene sesión; validamos el código en el servidor
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("student_open_attempt", {
      p_code: parsed.data.code,
    });

    if (error) {
      return NextResponse.json(
        { error: "RPC error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
