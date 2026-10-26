"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getSafeReturnTo, useLocationSearch } from "@/app/lib/client-auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpAvailable, setOtpAvailable] = useState(false);
  const [message, setMessage] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const search = useLocationSearch();
  const returnTo = getSafeReturnTo(new URLSearchParams(search).get("returnTo"));
  const [pending, setPending] = useState<"send" | "verify" | "signup" | "">("");
  const emailIsVerified = Boolean(email.trim()) && verifiedEmail === email.trim().toLowerCase();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formIsValid = fullName.trim().length >= 2
    && fullName.trim().length <= 120
    && emailIsValid
    && email.trim().length <= 254
    && phone.trim().length >= 5
    && phone.trim().length <= 30
    && password.length >= 8
    && password.length <= 72
    && password === confirmPassword;

  useEffect(() => {
    if (!resendAt) return;
    const updateCountdown = () => setCountdown(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const invalidateEmailVerification = async () => {
    try {
      const response = await fetch("/api/auth/verify-email", { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We couldn't clear the previous email verification. Please try again.");
      }
    } catch {
      setMessage("We couldn't clear the previous email verification. Please try again.");
    }
  };

  const sendOtp = async () => {
    setPending("send");
    setMessage("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; otpAvailable?: boolean };
      if (!response.ok) {
        setMessage(result.error ?? "We couldn't send a code. Please try again.");
        if (result.otpAvailable === false) {
          setOtp("");
          setOtpAvailable(false);
          setVerifiedEmail("");
        }
        return;
      }
      setOtp("");
      setOtpAvailable(true);
      setVerifiedEmail("");
      setResendAt(Date.now() + 60_000);
      setMessage("A six-digit verification code was sent to your email.");
    } catch {
      setMessage("We couldn't reach the email service. Check your connection and try again.");
    } finally {
      setPending("");
    }
  };

  const verifyOtp = async () => {
    setPending("verify");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We couldn't verify that code. Please try again.");
        return;
      }
      setVerifiedEmail(email.trim().toLowerCase());
      setMessage("Email verified. You can now create your account.");
    } catch {
      setMessage("We couldn't reach the verification service. Please try again.");
    } finally {
      setPending("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedEmail = email.trim().toLowerCase();

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setMessage("Please complete all fields.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!emailIsVerified || verifiedEmail !== submittedEmail) {
      setMessage("Verify this email address before creating your account.");
      return;
    }

    setPending("signup");
    setMessage("Creating your account...");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email: submittedEmail, phone, password, confirmPassword }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We couldn't create your account. Please try again.");
        return;
      }
      setMessage("Your email is verified and your account is ready. Taking you to login...");
      window.setTimeout(() => router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`), 1200);
    } catch {
      setMessage("We couldn't reach the account service. Please try again.");
    } finally {
      setPending("");
    }
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7edea] px-4 py-16 text-black">
      <div className="w-full max-w-2xl border border-black/10 bg-white p-8 sm:p-10">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-black/60">ELIJAH CLOTHINGSHOP</p>
        <h1 className="mt-5 text-center text-4xl tracking-[-0.06em]">Create Account</h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-black/70 sm:col-span-2">
            Full Name
            <input name="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" minLength={2} maxLength={120} required />
          </label>
          <label className="block text-sm text-black/70 sm:col-span-2">
            Email
            <span className="relative mt-2 block">
              <input type="email" name="email" value={email} disabled={pending !== ""} onChange={(event) => {
                if (verifiedEmail || resendAt > 0) void invalidateEmailVerification();
                setEmail(event.target.value);
                setOtp("");
                setOtpAvailable(false);
                setVerifiedEmail("");
                setResendAt(0);
                setMessage("");
              }} className="w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 pr-12 text-black outline-none" required />
              {emailIsVerified && <span aria-label="Email verified" title="Email verified" className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-green-700">&#10003;</span>}
            </span>
            {!emailIsVerified && (
              <span className="mt-3 block">
                <button type="button" onClick={sendOtp} disabled={pending !== "" || countdown > 0 || !emailIsValid || fullName.trim().length < 2} className="border border-black/15 px-4 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-[#f7edea] disabled:cursor-not-allowed disabled:opacity-50">
                  {pending === "send" ? "SENDING CODE..." : countdown > 0 ? `RESEND IN ${countdown}s` : "SEND OTP TO GMAIL"}
                </button>
                {resendAt > 0 && countdown === 0 && <span className="ml-3 text-xs text-black/55">You can request another code.</span>}
              </span>
            )}
          </label>
          {otpAvailable && !emailIsVerified && (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto]">
              <label className="block text-sm text-black/70">
                Six-digit verification code
                <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Six-digit verification code" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-center tracking-[0.4em] text-black outline-none" placeholder="000000" />
              </label>
              <button type="button" onClick={verifyOtp} disabled={pending !== "" || otp.length !== 6} className="self-end border border-black/15 px-5 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-[#f7edea] disabled:cursor-not-allowed disabled:opacity-50">
                {pending === "verify" ? "VERIFYING..." : "VERIFY EMAIL"}
              </button>
            </div>
          )}
          <label className="block text-sm text-black/70 sm:col-span-2">
            Phone Number
            <input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={5} maxLength={30} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70">
            Password
            <input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70">
            Confirm Password
            <input type="password" name="confirmPassword" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>

          <button type="submit" disabled={pending !== "" || !emailIsVerified || !formIsValid} className="sm:col-span-2 w-full border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-white hover:bg-[#3b2d28] disabled:cursor-not-allowed disabled:opacity-50">
            {pending === "signup" ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>

        {message && <p role="status" aria-live="polite" className="mt-4 text-center text-sm text-black/70">{message}</p>}
        <p className="mt-6 text-center text-sm text-black/70">
          Already have an account? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="font-medium text-black underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
