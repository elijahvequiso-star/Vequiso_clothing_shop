"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/app/data/products";
import { clearCart, getCartItems } from "@/app/data/store";
import { getAuthenticatedCustomer, getLoginUrl } from "@/app/lib/client-auth";

export default function CheckoutPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<{
    id: string;
    order_number: number;
    total: number;
    items: ReturnType<typeof getCartItems>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "gcash" | "maya">("gcash");
  const [qrOrder, setQrOrder] = useState<{ id: string; order_number: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [items, setItems] = useState<ReturnType<typeof getCartItems>>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const verifyCustomer = async () => {
      try {
        const user = await getAuthenticatedCustomer();
        if (!active) return;
        if (!user) {
          router.replace(getLoginUrl("/checkout", "checkout"));
          return;
        }
        setUserId(user.id);
        setFullName(user.full_name);
        setEmail(user.email);
        setItems(getCartItems(user.id));
      } catch (authError) {
        if (active) setMessage(authError instanceof Error ? authError.message : "Unable to verify your login.");
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    void verifyCustomer();
    return () => {
      active = false;
    };
  }, [router]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const shipping = subtotal > 0 ? 100 : 0;
  const total = subtotal + shipping;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || items.length === 0) return;
    setMessage("");
    setRequiresLogin(false);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        address: form.get("address"),
        city: form.get("city"),
        postalCode: form.get("postalCode"),
        paymentMethod,
        items: items.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
      }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; order?: { id: string; order_number: number; total: number } };
      if (!response.ok) {
        setMessage(result.error ?? "Your order could not be placed.");
        setRequiresLogin(response.status === 401);
        return;
      }
      if (!result.order) {
        setMessage("The order was saved, but its confirmation could not be loaded. Check My Orders before trying again.");
        return;
      }
      setSubmittedOrder({ ...result.order, items: [...items] });
      clearCart(userId);
      setItems([]);
      if (paymentMethod !== "cash_on_delivery") { setQrOrder(result.order); return; }
      setSubmitted(true);
    } catch {
      setMessage("We could not reach the order service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPaymentProof = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!qrOrder) return; setMessage("");
    const form = new FormData(event.currentTarget); form.set("orderId", qrOrder.id);
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders/payment-submission", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setMessage(result.error ?? "Payment proof could not be submitted."); return; }
      setProofSent(true);
    } catch { setMessage("We could not submit the receipt. Please try again."); }
    finally { setSubmitting(false); }
  };

  if (authLoading || !userId) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7edea] px-4 text-black">
        <div className="border border-black/10 bg-white p-8 text-center">
          <p role={message ? "alert" : undefined} className="text-sm text-black/70">{message || "Checking your account..."}</p>
          {message && <Link href="/login" className="mt-5 inline-flex underline">Log in</Link>}
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7edea] px-4 text-black">
        <div className="max-w-xl border border-black/10 bg-white p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Order confirmed</p>
          <h1 className="mt-4 text-4xl leading-none tracking-[-0.06em]">Thank you for your order.</h1>
          {submittedOrder && <section className="mt-6 border-y border-black/10 py-4 text-left">
            <div className="flex justify-between gap-3 text-sm"><span>Order #{submittedOrder.order_number}</span><span className="font-medium">{formatPrice(Number(submittedOrder.total))}</span></div>
            <ul className="mt-3 space-y-2 text-sm text-black/65">{submittedOrder.items.map((item, index) => <li key={`${item.productId}-${item.size}-${item.color}-${index}`}>{item.quantity} × {item.name} · {item.size} / {item.color}</li>)}</ul>
          </section>}
          <p className="mt-4 text-base leading-7 text-black/70">Your order is saved to your account. {paymentMethod === "cash_on_delivery" ? "Payment is due on delivery." : "Your QR payment proof is awaiting administrator review."}</p>
          <Link href="/account/orders" className="mt-5 inline-flex border border-black/10 px-6 py-3 text-[10px] uppercase tracking-[0.26em]">View My Orders</Link>
          <Link href="/shop" className="mt-3 inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  if (qrOrder) return <main className="min-h-[70vh] bg-[#f7edea] px-4 py-16 text-black"><div className="mx-auto max-w-xl border border-black/10 bg-white p-8"><p className="text-[10px] uppercase tracking-[0.32em] text-black/60">{paymentMethod.toUpperCase()} Â· order #{qrOrder.order_number}</p><h1 className="mt-4 text-4xl tracking-[-0.06em]">{proofSent ? "Proof submitted" : "Complete payment"}</h1><p className="mt-4 text-sm text-black/65">Order total</p><p className="text-3xl font-medium">{formatPrice(Number(qrOrder.total))}</p>{submittedOrder && <ul className="mt-4 space-y-2 border-y border-black/10 py-4 text-sm text-black/65">{submittedOrder.items.map((item, index) => <li key={`${item.productId}-${item.size}-${item.color}-${index}`}>{item.quantity} × {item.name} · {item.size} / {item.color}</li>)}</ul>}<Link href="/account/orders" className="mt-4 inline-flex border border-black/15 px-5 py-3 text-[10px] uppercase tracking-[0.2em]">View My Orders</Link>{proofSent ? <><p className="mt-4 text-sm leading-6 text-black/65">Your payment submission is pending verification. We will notify you when its status changes.</p></> : <><p className="mt-3 text-sm leading-6 text-black/65">Scan this QR code using your {paymentMethod === "gcash" ? "GCash" : "Maya"} app and pay the exact order total shown above.</p><Image src={paymentMethod === "gcash" ? "/gcash.png" : "/maya.png"} alt={`${paymentMethod === "gcash" ? "GCash" : "Maya"} payment QR code`} width={320} height={paymentMethod === "gcash" ? 618 : 366} className="mx-auto my-5 h-auto max-h-[28rem] max-w-full object-contain" /><ol className="list-inside list-decimal space-y-1 text-sm leading-6 text-black/70"><li>Open your {paymentMethod === "gcash" ? "GCash" : "Maya"} application.</li><li>Scan the displayed QR code.</li><li>Enter the exact total amount shown in your order.</li><li>Complete the payment.</li><li>Upload a screenshot or image of your payment receipt.</li><li>Submit the order for payment verification.</li></ol><form onSubmit={submitPaymentProof} className="mt-6 space-y-4"><label className="block text-sm">Payment reference (optional)<input name="reference" maxLength={160} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3" /></label><label className="block text-sm">Receipt image<input name="proof" type="file" accept="image/png,image/jpeg,image/webp" required className="mt-2 block w-full text-sm" /></label>{message && <p role="alert" className="text-sm text-red-800">{message}</p>}<button disabled={submitting} className="w-full bg-black px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-50">{submitting ? "Submitting…" : "Submit payment proof"}</button></form></>}</div></main>;

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
                  <input name="fullName" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70 sm:col-span-2">
                  Email
                  <input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70 sm:col-span-2">
                  Address
                  <input name="address" autoComplete="street-address" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70">
                  City
                  <input name="city" autoComplete="address-level2" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
                <label className="text-sm text-black/70">
                  ZIP Code
                  <input name="postalCode" autoComplete="postal-code" className="mt-2 w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-black outline-none" required />
                </label>
              </div>

              <fieldset className="mt-6 border border-black/10 bg-[#f9f5f4] p-4 text-sm text-black/70">
                <legend className="px-2">Payment method</legend>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={paymentMethod === "cash_on_delivery"}
                      onChange={() => setPaymentMethod("cash_on_delivery")}
                    />
                    Cash on delivery
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="gcash"
                      checked={paymentMethod === "gcash"}
                      onChange={() => setPaymentMethod("gcash")}
                    />
                    GCash
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="maya"
                      checked={paymentMethod === "maya"}
                      onChange={() => setPaymentMethod("maya")}
                    />
                    Maya
                  </label>
                </div>
                <div className="mt-5 border-t border-black/10 pt-4 text-center" aria-live="polite">
                  {paymentMethod === "cash_on_delivery" ? (
                    <p className="text-sm">Pay in cash when your order is delivered.</p>
                  ) : (
                    <>
                      <p className="text-sm">Scan this {paymentMethod === "gcash" ? "GCash" : "Maya"} QR code to pay:</p>
                      <Image
                        src={paymentMethod === "gcash" ? "/gcash.png" : "/maya.png"}
                        alt={`${paymentMethod === "gcash" ? "GCash" : "Maya"} payment QR code`}
                        width={320}
                        height={paymentMethod === "gcash" ? 618 : 366}
                        className="mx-auto mt-3 h-auto max-h-[28rem] max-w-full object-contain"
                      />
                    </>
                  )}
                </div>
              </fieldset>
              {message && <p role="alert" className="mt-4 text-sm text-red-800">{message}{requiresLogin && <> <Link href={getLoginUrl("/checkout", "checkout")} className="font-medium underline">Log in</Link> to place this order, then return here.</>}</p>}

      <button type="submit" disabled={submitting} className="mt-8 w-full border border-black/10 bg-black px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-white disabled:opacity-50">
                {submitting ? "Submittingâ€¦" : "Place Order"}
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
