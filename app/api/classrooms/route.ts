import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const profile = await getProfileByUserId(supabase, userId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institution_id");

    // Usamos admin client en API routes según el patrón del proyecto (bypasea RLS, filtramos manualmente)
    const admin = createAdminClient();

    // Para maestros: solo los salones que tienen asignados en classroom_teachers
    let classroomIds: string[] | null = null;
    if (profile.role === "maestro") {
      const { data: ctRows, error: ctError } = await admin
        .from("classroom_teachers")
        .select("classroom_id")
        .eq("teacher_profile_id", profile.id);

      if (ctError) {
        return NextResponse.json(
          { error: "DB error", message: ctError.message },
          { status: 500 },
        );
      }

      classroomIds = (ctRows ?? []).map((r: any) => r.classroom_id).filter(Boolean);

      if (!classroomIds.length) {
        return NextResponse.json({ classrooms: [] }, { status: 200 });
      }
    }

    // institution_id efectivo: parámetro URL > institution_id del perfil (para admin)
    const effectiveInstitutionId =
      institutionIdParam ??
      (profile.role === "admin" ? profile.institution_id : null);

    // Admin sin institución asignada y sin param → sin acceso
    if (profile.role === "admin" && !effectiveInstitutionId) {
      return NextResponse.json({ classrooms: [] }, { status: 200 });
    }

    // Master sin institution_id param → sin contexto, devolver vacío
    if (profile.role === "master" && !effectiveInstitutionId) {
      return NextResponse.json({ classrooms: [] }, { status: 200 });
    }

    let query = admin
      .from("classrooms")
      .select("id,name,grade_id")
      .is("deleted_at", null)
      .order("grade_id", { ascending: true })
      .order("name", { ascending: true });

    if (effectiveInstitutionId) {
      query = query.eq("institution_id", effectiveInstitutionId);
    }

    const finalQuery = classroomIds ? query.in("id", classroomIds) : query;
    const { data, error } = await finalQuery;

    if (error) {
      return NextResponse.json({ error: "DB error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ classrooms: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", message: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
