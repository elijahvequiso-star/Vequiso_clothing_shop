"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getAccounts, saveAccount } from "@/app/data/store";

export default function SignupPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setMessage("Please complete all fields.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const existing = getAccounts().find((account) => account.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setMessage("An account with this email already exists.");
      return;
    }

    saveAccount({ fullName, email, phone, password });
    setMessage("Account created successfully.");
    event.currentTarget.reset();
    setTimeout(() => router.push("/login"), 600);
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7edea] px-4 py-16 text-black">
      <div className="w-full max-w-2xl border border-black/10 bg-white p-8 sm:p-10">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-black/60">ELIJAH CLOTHINGSHOP</p>
        <h1 className="mt-5 text-center text-4xl tracking-[-0.06em]">Create Account</h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-black/70 sm:col-span-2">
            Full Name
            <input name="fullName" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70 sm:col-span-2">
            Email
            <input type="email" name="email" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70 sm:col-span-2">
            Phone Number
            <input name="phone" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70">
            Password
            <input type="password" name="password" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70">
            Confirm Password
            <input type="password" name="confirmPassword" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>

          <button type="submit" className="sm:col-span-2 w-full border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-white hover:bg-[#3b2d28]">
            CREATE ACCOUNT
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-black/70">{message}</p>}
      </div>
    </main>
  );
}
