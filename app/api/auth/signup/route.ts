import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";
import { hashRegistrationToken } from "@/app/lib/otp";

export const runtime = "nodejs";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(5).max(30),
  password: z.string().min(8).max(72),
  confirmPassword: z.string().min(8).max(72),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please provide valid registration details." }, { status: 400 });

  try {
    const { fullName, email, phone, password } = parsed.data;
    const registrationToken = (await cookies()).get("elijah_registration_proof")?.value;
    if (!registrationToken || !/^[a-f0-9]{64}$/.test(registrationToken)) {
      return NextResponse.json({ error: "Verify this email address before creating your account." }, { status: 403 });
    }
    const admin = createSupabaseAdminClient();
    const { data: existingProfile, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (lookupError) return NextResponse.json({ error: "We couldn't check this email right now." }, { status: 503 });
    if (existingProfile) return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 409 });

    const { data: consumed, error: verificationError } = await admin.rpc("consume_registration_verification", {
      p_email: email,
      p_registration_token_hash: hashRegistrationToken(registrationToken),
    });

    if (verificationError) return NextResponse.json({ error: "Email verification storage is unavailable. Apply the supplied Supabase migration and try again." }, { status: 503 });
    if (!consumed) return NextResponse.json({ error: "Verify this email address before creating your account." }, { status: 403 });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (error || !data.user) {
      const duplicate = error?.message.toLowerCase().includes("already") || error?.message.toLowerCase().includes("registered") || error?.message.toLowerCase().includes("exists");
      return NextResponse.json({ error: duplicate ? "An account with this email already exists. Please log in instead." : "We couldn't create your account. Please verify your email again and retry." }, { status: duplicate ? 409 : 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("elijah_registration_proof", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("OTP_PEPPER")) {
      return NextResponse.json({ error: "Email verification is not configured. Set the server environment variables and restart the app." }, { status: 503 });
    }
    return NextResponse.json({ error: "We couldn't create your account right now. Please try again." }, { status: 500 });
  }
}