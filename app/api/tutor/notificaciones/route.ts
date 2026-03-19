import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "tutor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

    const admin = createAdminClient();

    const { data: notifications, error: notifErr, count } = await admin
      .from("notifications")
      .select("id, title, body, related_attempt_id, is_read, created_at", { count: "exact" })
      .eq("recipient_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (notifErr) {
      return NextResponse.json(
        { error: "No se pudieron obtener las notificaciones", message: notifErr.message },
        { status: 500 },
      );
    }

    const { count: unreadCount, error: unreadErr } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", profile.id)
      .eq("is_read", false);

    if (unreadErr) {
      return NextResponse.json(
        { error: "No se pudo obtener el conteo de no leídas", message: unreadErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      notifications: notifications ?? [],
      unreadCount: unreadCount ?? 0,
      total: count ?? 0,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile || profile.role !== "tutor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (body.markAllRead === true) {
      const { error } = await admin
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_profile_id", profile.id)
        .eq("is_read", false);

      if (error) {
        return NextResponse.json(
          { error: "No se pudieron marcar las notificaciones", message: error.message },
          { status: 500 },
        );
      }
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      const { error } = await admin
        .from("notifications")
        .update({ is_read: true })
        .in("id", body.ids)
        .eq("recipient_profile_id", profile.id);

      if (error) {
        return NextResponse.json(
          { error: "No se pudieron marcar las notificaciones", message: error.message },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json({ error: "Se requiere ids o markAllRead" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Server error", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
