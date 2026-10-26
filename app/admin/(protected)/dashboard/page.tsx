import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const statuses = ["pending", "shipped", "delivered"] as const;

async function getPaidSales(db: ReturnType<typeof createSupabaseAdminClient>) {
  let total = 0; let offset = 0;
  while (true) {
    const { data, error } = await db.from("orders").select("total").eq("payment_status", "paid").neq("status", "cancelled").range(offset, offset + 999);
    if (error) return { total: 0, error };
    total += (data ?? []).reduce((sum, row) => sum + Number(row.total || 0), 0);
    if ((data ?? []).length < 1000) return { total, error: null };
    offset += 1000;
  }
}

export default async function AdminDashboardPage() {
  if (!(await requireAdmin())) redirect("/login");
  const db = createSupabaseAdminClient();
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 6 * 86400000).toISOString();
  const [sales, orders, customers, ...statusResults] = await Promise.all([
    getPaidSales(db),
    db.from("orders").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    ...statuses.map((status) => db.from("orders").select("id", { count: "exact", head: true }).eq("status", status)),
  ]);
  const recent = await db.from("orders").select("created_at,total,status,payment_status").gte("created_at", since).order("created_at", { ascending: true });
  const failed = Boolean(sales.error || orders.error || customers.error || statusResults.some((x) => x.error) || recent.error);
  const counts = Object.fromEntries(statuses.map((status, i) => [status, statusResults[i].count ?? 0]));
  const revenue = sales.total;
  const daily = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - i));
    const end = new Date(date); end.setDate(end.getDate() + 1);
    const rows = (recent.data ?? []).filter((row) => new Date(row.created_at) >= date && new Date(row.created_at) < end);
    return { day: date.toLocaleDateString("en-PH", { weekday: "short" }), orders: rows.length, sales: rows.filter((row) => row.payment_status === "paid" && row.status !== "cancelled").reduce((n, row) => n + Number(row.total || 0), 0) };
  });
  const cards = [
    ["Total Sales", currency.format(revenue)], ["Total Orders", orders.count ?? 0],
    ["Total Customers", customers.count ?? 0],
    ["Pending Orders", counts.pending], ["Shipped Orders", counts.shipped], ["Delivered Orders", counts.delivered],
  ];
  return <div>
    <p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Elijah Clothing Shop</p><h1 className="mt-3 text-5xl tracking-[-0.07em]">Dashboard</h1>
    {failed && <p role="alert" className="mt-5 border border-red-900/20 bg-red-50 p-4 text-sm text-red-900">Some live statistics could not be loaded. Check that the Supabase tables and admin migration are set up.</p>}
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="border border-black/10 bg-white p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-black/50">{label}</p><p className="mt-3 text-3xl tracking-[-0.05em]">{failed ? "—" : value}</p></div>)}</div>
    <div className="mt-8 grid gap-5 xl:grid-cols-2">{([["Orders", daily.map((x) => x.orders)], ["Paid Sales", daily.map((x) => x.sales)]] as const).map(([label, values]) => { const max = Math.max(1, ...values); return <section key={label} className="border border-black/10 bg-white p-6"><h2 className="text-sm uppercase tracking-[0.18em]">{label}, last 7 days</h2><div className="mt-6 flex h-44 items-end justify-between gap-3">{daily.map((day, i) => <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs text-black/55">{label === "Orders" ? values[i] : currency.format(values[i])}</span><div className={`w-full max-w-10 ${label === "Orders" ? "bg-[#6f5548]" : "bg-[#c4a58f]"}`} style={{ height: `${Math.max(4, values[i] / max * 78)}%` }} /><span className="text-[10px] uppercase text-black/50">{day.day}</span></div>)}</div></section>; })}</div>
    <section className="mt-8 border border-black/10 bg-white p-6"><h2 className="text-[10px] uppercase tracking-[0.2em] text-black/50">Order status</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{statuses.map((status) => <div key={status} className="border border-black/10 p-4"><p className="text-[10px] uppercase tracking-[0.15em] text-black/50">{status}</p><p className="mt-2 text-2xl">{failed ? "—" : counts[status]}</p></div>)}</div></section>
  </div>;
}
