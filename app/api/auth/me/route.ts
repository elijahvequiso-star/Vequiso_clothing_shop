import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ user: null });
  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase.from("profiles")
    .select("full_name, email, phone, role, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to verify your account." }, { status: 503 });
  return NextResponse.json({ user: profile ? { id: user.id, ...profile } : null });
}