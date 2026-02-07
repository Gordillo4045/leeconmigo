import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, userId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Maestro/Tutor/Admin/Master pueden leer salones de su institución (según RLS)
    const { data, error } = await supabase
      .from("classrooms")
      .select("id,name,grade_id")
      .is("deleted_at", null)
      .order("grade_id", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "DB error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ classrooms: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
