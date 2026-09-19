"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { formatPrice } from "@/app/data/products";
import { clearCart, getCartItems, saveOrder } from "@/app/data/store";

export default function CheckoutPage() {
  const [submitted, setSubmitted] = useState(false);
  const items = getCartItems();

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const shipping = subtotal > 0 ? 100 : 0;
  const total = subtotal + shipping;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) return;

    saveOrder({
      id: `ORD-${Date.now()}`,
      items,
      total,
      createdAt: new Date().toISOString(),
    });
    clearCart();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7edea] px-4 text-black">
        <div className="max-w-xl border border-black/10 bg-white p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Order confirmed</p>
          <h1 className="mt-4 text-4xl leading-none tracking-[-0.06em]">Thank you for your order.</h1>
          <p className="mt-4 text-base leading-7 text-black/70">Your order has been placed successfully. A confirmation email is on its way.</p>
          <Link href="/shop" className="mt-6 inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#f7edea] py-16 text-black">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <h1 className="text-5xl leading-none tracking-[-0.07em] sm:text-6xl">Checkout</h1>

        {items.length === 0 ? (
          <div className="mt-8 border border-black/10 bg-white p-8 text-center text-black/70">
            Your cart is empty. Add items before checkout.
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={handleSubmit} className="border border-black/10 bg-white p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm text-black/70 sm:col-span-2">
                  Full Name
                  <input className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70 sm:col-span-2">
                  Email
                  <input type="email" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70 sm:col-span-2">
                  Address
                  <input className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70">
                  City
                  <input className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70">
                  ZIP Code
                  <input className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
              </div>

              <button type="submit" className="mt-8 w-full border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-white">
                Place Order
              </button>
            </form>

            <aside className="border border-black/10 bg-white p-6">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Summary</p>
              <div className="mt-6 space-y-4 text-base text-black/70">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(shipping)}</span></div>
                <div className="mt-4 flex justify-between border-t border-black/10 pt-4 text-lg font-medium text-black"><span>Total</span><span>{formatPrice(total)}</span></div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
