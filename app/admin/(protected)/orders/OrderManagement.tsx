"use client";

import { FormEvent, useEffect, useState } from "react";

const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof statuses)[number];
type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  shipping_address: Record<string, unknown> | string;
  total: number;
  payment_status: string;
  payment_method: string | null;
  status: OrderStatus;
  courier_name: string | null;
  tracking_number: string | null;
  created_at: string;
  order_items: { id: string; product_name: string; size: string; color: string; quantity: number; unit_price: number }[];
};
type Draft = { status: OrderStatus; courier_name: string; tracking_number: string };
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (submittedSearch) params.set("search", submittedSearch);
    if (filter) params.set("status", filter);
    fetch(`/api/admin/orders?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { orders?: Order[]; total?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to load orders.");
        if (active) {
          setOrders(result.orders ?? []);
          setTotal(result.total ?? 0);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setOrders([]);
          setMessage(error instanceof Error ? error.message : "Unable to load orders.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, page, refreshIndex, submittedSearch]);

  const updateDraft = (order: Order, change: Partial<Draft>) => {
    setDrafts((current) => {
      const draft = current[order.id] ?? { status: order.status, courier_name: order.courier_name ?? "", tracking_number: order.tracking_number ?? "" };
      return { ...current, [order.id]: { ...draft, ...change } };
    });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setSubmittedSearch(search.trim());
  };

  const save = async (order: Order, statusOverride?: OrderStatus) => {
    const draft = { ...(drafts[order.id] ?? { status: order.status, courier_name: order.courier_name ?? "", tracking_number: order.tracking_number ?? "" }), status: statusOverride ?? drafts[order.id]?.status ?? order.status };
    setBusyId(order.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: draft.status, courier_name: draft.courier_name, tracking_number: draft.tracking_number }),
      });
      const result = await response.json() as { error?: string; emailStatus?: "sent" | "not_configured" | "failed" };
      if (!response.ok) throw new Error(result.error ?? "Unable to save the order.");
      const emailMessage = result.emailStatus === "not_configured" ? " Email was not sent because SMTP is not configured." : result.emailStatus === "failed" ? " Email delivery failed; the in-app notification is available." : result.emailStatus === "sent" ? " Customer email sent." : "";
      setMessage(`Order #${order.order_number} was updated.${emailMessage}`);
      setLoading(true);
      setRefreshIndex((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the order.");
    } finally {
      setBusyId("");
    }
  };

  return <section className="mt-7">
    <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order number, customer, or email" className="min-w-0 flex-1 border border-black/10 bg-white px-4 py-3 text-sm outline-none" />
      <select value={filter} onChange={(event) => { setLoading(true); setFilter(event.target.value); setPage(1); }} aria-label="Filter orders by status" className="border border-black/10 bg-white px-4 py-3 text-sm"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
      <button className="bg-black px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white">Search</button>
    </form>
    {message && <p role="status" className="mt-4 border border-black/10 bg-white p-3 text-sm">{message}</p>}
    {loading ? <p className="mt-6 border border-black/10 bg-white p-8 text-sm text-black/60">Loading orders…</p> : orders.length === 0 ? <p className="mt-6 border border-black/10 bg-white p-8 text-sm text-black/60">{message ? "Orders could not be loaded." : "No orders match these filters."}</p> : <div className="mt-6 space-y-4">
      {orders.map((order) => {
        const draft = drafts[order.id] ?? { status: order.status, courier_name: order.courier_name ?? "", tracking_number: order.tracking_number ?? "" };
        const address = typeof order.shipping_address === "string" ? order.shipping_address : Object.values(order.shipping_address ?? {}).filter(Boolean).join(", ");
        return <article key={order.id} className="border border-black/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-4"><div><p className="text-xs uppercase tracking-[0.16em] text-black/50">Order #{order.order_number}</p><h2 className="mt-2 text-xl">{order.customer_name}</h2><p className="text-sm text-black/55">{order.customer_email}</p></div><div className="text-right"><p className="text-xl">₱{Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p><p className="mt-1 text-xs uppercase text-black/55">Payment: {order.payment_status}{order.payment_method ? ` · ${order.payment_method}` : ""}</p><p className="mt-1 text-xs text-black/50">{new Date(order.created_at).toLocaleString()}</p></div></div>
          <div className="grid gap-5 py-4 lg:grid-cols-2"><div><p className="text-[10px] uppercase tracking-[0.15em] text-black/50">Items ordered</p>{order.order_items?.length ? <ul className="mt-2 divide-y divide-black/10 border-y border-black/10">{order.order_items.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm"><span className="min-w-0"><span className="block font-medium">{item.quantity} × {item.product_name}</span><span className="mt-1 block text-xs text-black/55">Size: {item.size} · Color: {item.color} · ₱{Number(item.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} each</span></span><span className="shrink-0 text-right">₱{(Number(item.unit_price) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></li>)}</ul> : <p className="mt-2 text-sm text-black/55">No item details are recorded for this order.</p>}<p className="mt-4 text-[10px] uppercase tracking-[0.15em] text-black/50">Shipping address</p><p className="mt-2 text-sm text-black/70">{address || "Not provided"}</p></div>
            <div className="grid content-start gap-3 sm:grid-cols-2"><label className="text-xs text-black/55">Order status<select value={draft.status} onChange={(event) => updateDraft(order, { status: event.target.value as OrderStatus })} className="mt-1 w-full border border-black/10 bg-[#f9f5f4] px-3 py-2 text-sm text-black"><option value={order.status}>{order.status}</option>{transitions[order.status].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="text-xs text-black/55">Courier<input value={draft.courier_name} onChange={(event) => updateDraft(order, { courier_name: event.target.value })} maxLength={120} className="mt-1 w-full border border-black/10 bg-[#f9f5f4] px-3 py-2 text-sm text-black" placeholder="Courier name" /></label><label className="text-xs text-black/55 sm:col-span-2">Tracking number<input value={draft.tracking_number} onChange={(event) => updateDraft(order, { tracking_number: event.target.value })} maxLength={160} className="mt-1 w-full border border-black/10 bg-[#f9f5f4] px-3 py-2 text-sm text-black" placeholder="Tracking number" /></label><div className="sm:col-span-2"><button type="button" onClick={() => void save(order)} disabled={busyId === order.id} className="bg-black px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-50">{busyId === order.id ? "Saving…" : "Save order update"}</button></div></div>
          </div>
          {order.tracking_number && <p className="border-t border-black/10 pt-3 text-xs text-black/55">Current tracking: {order.courier_name ? `${order.courier_name} · ` : ""}{order.tracking_number}</p>}
        </article>;
      })}
      <div className="flex items-center justify-between border border-black/10 bg-white p-4 text-sm"><span>{total} orders · Page {page} of {Math.max(1, Math.ceil(total / 20))}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }} className="border border-black/10 px-4 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="border border-black/10 px-4 py-2 disabled:opacity-40">Next</button></div></div>
    </div>}
  </section>;
}
