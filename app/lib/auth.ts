import "server-only";

import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;
  return data.user;
}

export async function requireAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin" || profile.account_status !== "active") return null;
  return { user, profile };
}