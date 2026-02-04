import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=oauth", url.origin));
  }

  const supabase = await createClient();
  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=oauth", url.origin));
  }

  if (nextParam) {
    return NextResponse.redirect(new URL(nextParam, url.origin));
  }

  const user = sessionData.user;
  if (!user) {
    return NextResponse.redirect(new URL("/protected", url.origin));
  }

  const profile = await getProfileByUserId(supabase, user.id);
  const role = profile?.role;
  if (role === "tutor") {
    return NextResponse.redirect(new URL("/tutor", url.origin));
  }
  if (role === "maestro") {
    return NextResponse.redirect(new URL("/maestro", url.origin));
  }
  if (role === "admin" || role === "master") {
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  return NextResponse.redirect(new URL("/protected", url.origin));
}
