import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";
import { generateRegistrationToken, hashOtp, hashRegistrationToken } from "@/app/lib/otp";

export const runtime = "nodejs";
const registrationCookie = "elijah_registration_proof";

function clearRegistrationCookie(response: NextResponse) {
  response.cookies.set(registrationCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });
  return response;
}

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  otp: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });

  try {
    const { email, otp } = parsed.data;
    const token = generateRegistrationToken();
    const admin = createSupabaseAdminClient();
    const { data: verification, error: lookupError } = await admin
      .from("registration_email_verifications")
      .select("otp_hash")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("OTP verification lookup failed:", { code: lookupError.code });
      return NextResponse.json({ error: "Email verification storage is unavailable. Please try again later." }, { status: 503 });
    }

    const storedHash = verification?.otp_hash;
    const storedHashIsValid = typeof storedHash === "string" && /^[a-f0-9]{64}$/.test(storedHash);
    const expectedHash = storedHashIsValid ? storedHash : "0".repeat(64);
    const submittedHash = hashOtp(otp);
    const hashesMatch = timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(submittedHash, "hex"));
    const { data: result, error } = await admin.rpc("verify_registration_otp", {
      p_email: email,
      p_expected_otp_hash: expectedHash,
      p_otp_matches: storedHashIsValid && hashesMatch,
      p_registration_token_hash: hashRegistrationToken(token),
    });

    if (error) {
      console.error("OTP verification RPC failed:", { code: error.code });
      return NextResponse.json({ error: "Email verification storage is unavailable. Apply the supplied Supabase migrations and try again." }, { status: 503 });
    }
    if (result === "invalid") return NextResponse.json({ error: "That code is incorrect. Check it and try again." }, { status: 400 });
    if (result === "expired") return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 410 });
    if (result === "locked") return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
    if (result === "used") return NextResponse.json({ error: "That code has already been used. Request a new one." }, { status: 409 });
    if (result === "stale") return NextResponse.json({ error: "A newer code has been issued. Enter the latest code from your email." }, { status: 409 });
    if (result === "undelivered") return NextResponse.json({ error: "Email delivery is still being confirmed. Please try again shortly." }, { status: 409 });
    if (result !== "verified") return NextResponse.json({ error: "We couldn't verify this code. Request a new one and try again." }, { status: 400 });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(registrationCookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 5 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && (error.message.includes("not configured") || error.message.includes("OTP_PEPPER"))) {
      return NextResponse.json({ error: "Email verification is not configured. Set the server environment variables and restart the app." }, { status: 503 });
    }
    return NextResponse.json({ error: "We couldn't verify this code right now. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const token = (await cookies()).get(registrationCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return clearRegistrationCookie(NextResponse.json({ ok: true }));
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc("revoke_registration_verification", {
      p_registration_token_hash: hashRegistrationToken(token),
    });
    if (error) {
      console.error("Registration proof revocation RPC failed:", { code: error.code });
      return clearRegistrationCookie(NextResponse.json(
        { error: "We couldn't clear the previous email verification. Please try again." },
        { status: 503 },
      ));
    }
    return clearRegistrationCookie(NextResponse.json({ ok: true }));
  } catch {
    console.error("Registration proof revocation failed:", { code: "unexpected_failure" });
    return clearRegistrationCookie(NextResponse.json(
      { error: "We couldn't clear the previous email verification. Please try again." },
      { status: 503 },
    ));
  }
}