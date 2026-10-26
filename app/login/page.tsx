"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSafeReturnTo, useLocationSearch } from "@/app/lib/client-auth";

export default function LoginPage() {
  const router = useRouter();
  const search = useLocationSearch();
  const [message, setMessage] = useState("");
  const params = new URLSearchParams(search);
  const requestedReturnTo = params.get("returnTo");
  const returnTo = getSafeReturnTo(requestedReturnTo);
  const reason = params.get("reason") === "cart"
    ? "Please log in or create an account to add products to your cart."
    : params.get("reason") === "view-cart"
      ? "Please log in to view your cart."
    : params.get("reason") === "checkout"
      ? "Please log in to your account before proceeding to checkout."
      : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; role?: string };

      if (!response.ok) {
        setMessage(result.error ?? "Invalid email or password.");
        if (result.error?.includes("verify")) window.sessionStorage.setItem("elijah-verification-email", email);
        return;
      }

      router.push(result.role === "admin" ? getSafeReturnTo(requestedReturnTo, "/admin/dashboard") : returnTo);
    } catch {
      setMessage("We could not reach the login service. Please try again.");
    }
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7edea] px-4 py-16 text-black">
      <div className="w-full max-w-xl border border-black/10 bg-white p-8 sm:p-10">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-black/60">ELIJAH CLOTHINGSHOP</p>
        <h1 className="mt-5 text-center text-4xl tracking-[-0.06em]">Welcome Back</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm text-black/70">Email<input type="email" name="email" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required /></label>
          <label className="block text-sm text-black/70">Password<input type="password" name="password" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required /></label>
          <button type="submit" className="w-full border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-white hover:bg-[#3b2d28]">LOGIN</button>
          {reason && <p className="text-sm text-black/70">{reason}</p>}
          {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
        </form>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-black/70">
          <Link href="/shop" className="hover:underline">Forgot Password?</Link>
          <p>Don&apos;t have an account? <Link href={`/signup?returnTo=${encodeURIComponent(returnTo)}`} className="font-medium text-black underline">CREATE ACCOUNT</Link></p>
        </div>
      </div>
    </main>
  );
}
