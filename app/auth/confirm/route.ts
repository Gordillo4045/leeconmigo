import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile-server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  if (!token_hash || !type) {
    redirect(`/auth/error?error=No token hash or type`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  if (nextParam) {
    redirect(nextParam);
  }

  const user = data.user;
  if (!user) {
    redirect("/protected");
  }

  const profile = await getProfileByUserId(supabase, user.id);
  const role = profile?.role;
  if (role === "tutor") redirect("/tutor");
  if (role === "maestro") redirect("/maestro");
  if (role === "admin" || role === "master") redirect("/admin");
  redirect("/protected");
}
