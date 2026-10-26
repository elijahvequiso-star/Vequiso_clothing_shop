"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CartItem from "@/app/components/CartItem";
import { getCartItems } from "@/app/data/store";
import { formatPrice } from "@/app/data/products";
import { getAuthenticatedCustomer, getLoginUrl } from "@/app/lib/client-auth";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReturnType<typeof getCartItems>>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const user = await getAuthenticatedCustomer();
        if (!active) return;
        if (!user) {
          router.replace(getLoginUrl("/cart", "view-cart"));
          return;
        }
        setUserId(user.id);
        setItems(getCartItems(user.id));
        setError("");
      } catch (authError) {
        if (active) setError(authError instanceof Error ? authError.message : "Unable to verify your login.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      active = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [router]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const shipping = subtotal > 0 ? 100 : 0;
  const total = subtotal + shipping;

  if (loading || !userId) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7edea] px-4 text-black">
        <p role={error ? "alert" : undefined} className="text-sm text-black/70">{error || "Checking your account..."}</p>
      </main>
    );
  }

  return (
    <main className="bg-[#f7edea] py-12 text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <h1 className="text-5xl leading-none tracking-[-0.07em] sm:text-6xl">Your Cart</h1>
        {error && <p role="alert" className="mt-5 text-sm text-red-800">{error}</p>}

        {items.length === 0 ? (
          <div className="mt-10 border border-black/10 bg-white p-8 text-center">
            <p className="text-xl tracking-[-0.04em]">Your cart is empty.</p>
            <Link href="/shop" className="mt-6 inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="border border-black/10 bg-white p-4 sm:p-6">
              {items.map((item) => (
                <CartItem key={`${item.productId}-${item.size}-${item.color}`} item={item} userId={userId} />
              ))}
            </div>

            <aside className="border border-black/10 bg-white p-6">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Summary</p>
              <div className="mt-6 space-y-4 text-base text-black/75">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(shipping)}</span></div>
                <div className="mt-5 flex justify-between border-t border-black/10 pt-4 text-lg font-medium text-black">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link href="/checkout" className="mt-8 inline-flex w-full items-center justify-center border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.28em] text-white">
                Checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
