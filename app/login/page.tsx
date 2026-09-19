"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getAccounts, setCurrentUser } from "@/app/data/store";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const user = getAccounts().find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
    );

    if (!user) {
      setMessage("Invalid email or password.");
      return;
    }

    setCurrentUser(user);
    setMessage("");
    router.push("/account");
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f7edea] px-4 py-16 text-black">
      <div className="w-full max-w-xl border border-black/10 bg-white p-8 sm:p-10">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-black/60">ELIJAH CLOTHINGSHOP</p>
        <h1 className="mt-5 text-center text-4xl tracking-[-0.06em]">Welcome Back</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm text-black/70">
            Email
            <input type="email" name="email" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>
          <label className="block text-sm text-black/70">
            Password
            <input type="password" name="password" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
          </label>

          <button type="submit" className="w-full border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-white hover:bg-[#3b2d28]">
            LOGIN
          </button>

          {message && <p className="text-sm text-black/70">{message}</p>}
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-black/70">
          <Link href="/shop" className="hover:underline">Forgot Password?</Link>
          <p>
            Don’t have an account? <Link href="/signup" className="font-medium text-black underline">CREATE ACCOUNT</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
