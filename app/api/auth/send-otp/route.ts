import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";
import {
  generateOtp,
  hashOtp,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OtpDeliveryError,
  sendOtpEmail,
  validateSmtpEnvironment,
} from "@/app/lib/otp";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
});

function deliveryMessage(error: OtpDeliveryError) {
  if (error.stage === "configuration") {
    return "Email service is not configured. Please contact support.";
  }
  if (error.stage === "authorization") {
    return "Gmail SMTP authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD.";
  }
  if (error.stage === "quota") {
    return "Gmail is temporarily limiting email delivery. Please try again later.";
  }
  if (error.stage === "network") {
    return "The email service timed out or could not be reached. Please try again shortly.";
  }
  return "Gmail could not accept the verification email right now. Check the Gmail SMTP settings and try again.";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your name and a valid email address." }, { status: 400 });
  }

  const smtpConfiguration = validateSmtpEnvironment();
  if (!smtpConfiguration.valid) {
    for (const variable of smtpConfiguration.invalidVariables) {
      console.error("OTP email configuration is missing or invalid:", { variable });
    }
    const passwordHint = smtpConfiguration.invalidVariables.includes("GMAIL_APP_PASSWORD")
      ? " GMAIL_APP_PASSWORD must be a 16-character Google App Password for the GMAIL_USER account."
      : "";
    return NextResponse.json(
      { error: `Email service is not configured correctly. Check ${smtpConfiguration.invalidVariables.join(", ")} in .env.local and restart the app.${passwordHint}` },
      { status: 503 },
    );
  }

  try {
    const { email } = parsed.data;
    const admin = createSupabaseAdminClient();
    const invalidateOtp = (otpHash: string) => admin
      .from("registration_email_verifications")
      .delete()
      .eq("email", email)
      .eq("otp_hash", otpHash);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      const code = profileError.code || (/fetch failed|network|timeout/i.test(profileError.message) ? "supabase_network_error" : "supabase_request_failed");
      console.error("OTP profile lookup failed:", { code });
      const message = code === "supabase_network_error"
        ? "We can't reach Supabase right now. Check your internet connection and NEXT_PUBLIC_SUPABASE_URL, then try again."
        : "We couldn't check this email with the account service. Check the Supabase setup and try again.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (profile) {
      return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 409 });
    }

    const otp = generateOtp();
    const { data: issueResult, error: issueError } = await admin.rpc("issue_registration_otp", {
      p_email: email,
      p_otp_hash: hashOtp(otp),
      p_expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000).toISOString(),
    });

    if (issueError) {
      console.error("OTP issuance RPC failed:", { code: issueError.code });
      return NextResponse.json(
        { error: "Email verification storage is unavailable. Apply the Supabase email-verification migrations and try again." },
        { status: 503 },
      );
    }
    if (issueResult === "cooldown") {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code.", retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS },
        { status: 429, headers: { "Retry-After": String(OTP_RESEND_COOLDOWN_SECONDS) } },
      );
    }
    if (issueResult === "limit") {
      return NextResponse.json({ error: "You have reached the code request limit. Try again after the 24-hour limit resets." }, { status: 429 });
    }
    if (issueResult !== "sent") {
      console.error("OTP issuance RPC returned an unexpected result.");
      return NextResponse.json({ error: "We couldn't start email verification. Please try again." }, { status: 500 });
    }

    try {
      await sendOtpEmail(email, otp);
    } catch (error) {
      const { error: invalidateError } = await invalidateOtp(hashOtp(otp));
      if (invalidateError) {
        console.error("Failed to delete an undelivered OTP:", { code: invalidateError.code || "supabase_request_failed" });
      }
      if (error instanceof OtpDeliveryError) {
        console.error("Gmail OTP delivery failed:", {
          stage: error.stage,
          code: error.code,
          status: error.status,
          providerCode: error.providerCode,
        });
        const status = error.stage === "configuration" ? 503 : error.status === 429 ? 429 : 502;
        return NextResponse.json(
          { error: deliveryMessage(error), retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS, otpAvailable: false },
          { status, headers: { "Retry-After": String(OTP_RESEND_COOLDOWN_SECONDS) } },
        );
      }

      console.error("Gmail OTP delivery failed:", { stage: "unknown", code: "unexpected_failure" });
      return NextResponse.json(
        { error: "Gmail could not send the verification email. Please check the server email settings and try again.", retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS, otpAvailable: false },
        { status: 502, headers: { "Retry-After": String(OTP_RESEND_COOLDOWN_SECONDS) } },
      );
    }

    const { data: deliveryConfirmed, error: deliveryConfirmationError } = await admin.rpc("confirm_registration_otp_delivery", {
      p_email: email,
      p_otp_hash: hashOtp(otp),
    });
    if (deliveryConfirmationError || deliveryConfirmed !== true) {
      if (deliveryConfirmationError) {
        console.error("OTP delivery confirmation RPC failed:", { code: deliveryConfirmationError.code });
      } else {
        console.error("OTP delivery confirmation RPC returned an unexpected result.");
      }
      const { error: invalidateError } = await invalidateOtp(hashOtp(otp));
      if (invalidateError) {
        console.error("Failed to delete an unconfirmed OTP:", { code: invalidateError.code || "supabase_request_failed" });
      }
      return NextResponse.json(
        { error: "The email was accepted, but verification could not be activated. Please request a new code after the resend timer.", retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS, otpAvailable: false },
        { status: 503, headers: { "Retry-After": String(OTP_RESEND_COOLDOWN_SECONDS) } },
      );
    }

    return NextResponse.json({ ok: true, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("OTP_PEPPER")) {
      return NextResponse.json({ error: "Email verification is not configured. Set OTP_PEPPER to at least 32 random characters and restart the app." }, { status: 503 });
    }
    if (error instanceof Error && error.message.includes("Supabase admin access is not configured")) {
      return NextResponse.json({ error: "Supabase server access is not configured. Set the server environment variables and restart the app." }, { status: 503 });
    }
    console.error("OTP send request failed:", { code: "unexpected_failure" });
    return NextResponse.json({ error: "We couldn't send a verification code right now. Please try again." }, { status: 500 });
  }
}
