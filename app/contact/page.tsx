"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (!fullName || !email || !subject || !message) {
      setStatus("Please complete all fields before sending your message.");
      return;
    }

    setStatus("Your message has been sent. We’ll get back to you soon.");
    event.currentTarget.reset();
  };

  return (
    <main className="bg-[#f7edea] py-16 text-black">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Contact</p>
          <h1 className="mt-5 text-5xl leading-none tracking-[-0.07em] sm:text-6xl">GET IN TOUCH</h1>
          <div className="mt-8 space-y-4 text-base text-black/70">
            <p>Email: hello@elijahshop.com</p>
            <p>Phone: +63 917 123 4567</p>
            <p>Address: 12 M. H. del Pilar St., Makati, Philippines</p>
            <p>Business Hours: Mon–Sat, 10:00 AM–7:00 PM</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border border-black/10 bg-white p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-black/70">
              Full Name
              <input name="fullName" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" />
            </label>
            <label className="text-sm text-black/70">
              Email
              <input type="email" name="email" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" />
            </label>
          </div>

          <label className="mt-5 block text-sm text-black/70">
            Subject
            <input name="subject" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" />
          </label>

          <label className="mt-5 block text-sm text-black/70">
            Message
            <textarea name="message" rows={6} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" />
          </label>

          <button type="submit" className="mt-6 inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-white hover:bg-[#3b2d28]">
            SEND MESSAGE
          </button>

          {status && <p className="mt-4 text-sm text-black/70">{status}</p>}
        </form>
      </div>
    </main>
  );
}
