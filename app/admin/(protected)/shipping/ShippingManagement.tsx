"use client";
import { useCallback, useEffect, useState } from "react";

type ShippingOrder = { id: string; order_number: number; customer_name: string; customer_email: string; total: number; status: string; courier_name: string | null; tracking_number: string | null; created_at: string };
export default function ShippingManagement() {
  const [orders, setOrders] = useState<ShippingOrder[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/orders?statuses=processing,shipped&pageSize=100", { cache: "no-store" });
    const result = await response.json() as { orders?: ShippingOrder[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to load shipping orders."); setOrders(result.orders ?? []);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load orders.")); }, [refresh]);
  const transition = async (order: ShippingOrder, status: "shipped" | "delivered") => {
    setBusy(order.id); setMessage("");
    try { const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, status, courier_name: order.courier_name, tracking_number: order.tracking_number }) }); const result = await response.json() as { error?: string; emailStatus?: string }; if (!response.ok) throw new Error(result.error ?? "Unable to update shipping status."); setMessage(`Order #${order.order_number} marked ${status}. Customer notification sent.${result.emailStatus === "sent" ? " Email sent too." : ""}`); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update order."); } finally { setBusy(""); }
  };
  return <section className="mt-7">{message && <p role="status" className="mb-4 border border-black/10 bg-white p-3 text-sm">{message}</p>}{orders.length === 0 ? <p className="border border-black/10 bg-white p-6 text-sm text-black/60">No orders are waiting to ship or deliver.</p> : <div className="space-y-3">{orders.map((order) => <article key={order.id} className="flex flex-col justify-between gap-4 border border-black/10 bg-white p-5 sm:flex-row sm:items-center"><div><p className="text-xs uppercase text-black/50">Order #{order.order_number} · {order.status}</p><h2 className="mt-2 text-lg">{order.customer_name}</h2><p className="text-sm text-black/55">{order.customer_email}</p><p className="mt-1 text-xs text-black/50">{order.courier_name || "Courier not set"}{order.tracking_number ? ` · ${order.tracking_number}` : ""}</p></div><button type="button" disabled={busy === order.id} onClick={() => void transition(order, order.status === "processing" ? "shipped" : "delivered")} className="bg-black px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-50">{busy === order.id ? "Updating…" : order.status === "processing" ? "Ship" : "Delivered"}</button></article>)}</div>}</section>;
}
