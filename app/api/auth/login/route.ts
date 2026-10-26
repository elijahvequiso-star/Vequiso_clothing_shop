import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  expectedRole: z.enum(["customer", "admin"]).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  try {
    const supabase = await createSupabaseServerClient();
    const { email, password, expectedRole } = parsed.data;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = error.message.toLowerCase().includes("confirm") ? "Please verify your email address before logging in." : "Invalid email or password.";
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Please verify your email address before logging in." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.account_status !== "active") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This account is not active. Contact the store administrator." }, { status: 403 });
    }

    if (expectedRole && profile.role !== expectedRole) {
      await supabase.auth.signOut();
      const errorMessage = expectedRole === "admin"
        ? "This account does not have administrator access."
        : "Please use the administrator login page for this account.";
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json({ ok: true, role: profile.role });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Supabase is not configured")) {
      return NextResponse.json({ error: "Authentication is not configured. Add the Supabase environment variables and restart the dev server." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to sign in right now. Please try again later." }, { status: 500 });
  }
}
