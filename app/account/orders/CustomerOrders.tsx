"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  order_number: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  created_at: string;
  order_items: { id: string; product_name: string; size: string; color: string; quantity: number; unit_price: number }[];
  order_status_history: { id: string; previous_status: string | null; new_status: string; created_at: string }[];
};
type Notification = { id: string; order_id: string | null; title: string; body: string; read_at: string | null; created_at: string };

export default function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("Loading your orders…");

  const paymentLabel = (status: string, method: string | null) => status === "pending" && (method === "gcash" || method === "maya") ? "Pending verification" : status === "pending" ? "Pending" : status === "paid" ? "Paid" : status === "failed" ? "Failed" : status;
  const methodLabel = (method: string | null) => method === "gcash" ? "GCash" : method === "maya" ? "Maya" : method === "cash_on_delivery" ? "Cash on delivery" : method;

  useEffect(() => {
    let active = true;
    fetch("/api/orders", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { orders?: Order[]; notifications?: Notification[]; warnings?: string[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load your orders.");
      if (!active) return;
      setOrders(result.orders ?? []);
      setNotifications(result.notifications ?? []);
      setWarnings(result.warnings ?? []);
      setMessage("");
    }).catch((error: unknown) => {
      if (active) setMessage(error instanceof Error ? error.message : "Unable to load your orders.");
    });
    return () => { active = false; };
  }, []);

  return <div className="mt-8 space-y-8">
    {warnings.map((warning) => <p key={warning} role="status" className="border border-amber-900/20 bg-amber-50 p-4 text-sm text-amber-950">{warning} Your saved orders are still shown below.</p>)}
    <section><h2 className="text-[10px] uppercase tracking-[0.25em] text-black/55">Order updates</h2>{notifications.length ? <div className="mt-3 space-y-3">{notifications.map((notification) => <article key={notification.id} className="border border-black/10 bg-white p-4"><div className="flex justify-between gap-4"><h3 className="font-medium">{notification.title}</h3><time className="text-xs text-black/45">{new Date(notification.created_at).toLocaleDateString()}</time></div><p className="mt-1 text-sm text-black/65">{notification.body}</p></article>)}</div> : <p className="mt-3 text-sm text-black/55">No new updates.</p>}</section>
    <section><h2 className="text-[10px] uppercase tracking-[0.25em] text-black/55">Order history</h2>{message ? <p role="status" className="mt-3 border border-black/10 bg-white p-5 text-sm text-black/60">{message}</p> : orders.length === 0 ? <p className="mt-3 border border-black/10 bg-white p-5 text-sm text-black/60">You haven’t placed any orders yet.</p> : <div className="mt-3 space-y-4">{orders.map((order) => <article key={order.id} className="border border-black/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg">Order #{order.order_number}</h3><p className="mt-1 text-xs text-black/50">{new Date(order.created_at).toLocaleString()}</p></div><div className="text-right"><p className="font-medium">₱{Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p><p className="mt-1 text-xs uppercase text-black/55">Order {order.status} · Payment {paymentLabel(order.payment_status, order.payment_method)}</p><p className="mt-1 text-xs text-black/55">{methodLabel(order.payment_method)}</p></div></div><div className="mt-4 border-t border-black/10 pt-3"><h4 className="text-[10px] uppercase tracking-[0.18em] text-black/50">Items ordered</h4>{order.order_items?.length ? <ul className="mt-2 divide-y divide-black/10 text-sm text-black/70">{order.order_items.map((item) => <li key={item.id} className="flex justify-between gap-4 py-2"><span>{item.quantity} × {item.product_name} · {item.size} / {item.color}</span><span className="shrink-0">₱{(Number(item.unit_price) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></li>)}</ul> : <p className="mt-2 text-sm text-black/55">Item details unavailable.</p>}</div>{order.tracking_number && <p className="mt-3 text-sm">Tracking: {order.courier_name ? `${order.courier_name} · ` : ""}{order.tracking_number}</p>}{order.order_status_history?.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-black/55">Status history</summary><ol className="mt-3 space-y-2 text-xs text-black/60">{order.order_status_history.map((history) => <li key={history.id}>{history.previous_status ? `${history.previous_status} → ` : ""}{history.new_status} · {new Date(history.created_at).toLocaleString()}</li>)}</ol></details>}</article>)}</div>}</section>
  </div>;
}
