import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

export default async function AdminNotificationsPage() {
  if (!(await requireAdmin())) redirect("/login");
  const { data, error } = await createSupabaseAdminClient().from("notifications").select("id,user_id,order_id,title,body,created_at").order("created_at", { ascending: false }).limit(100);
  return <div><p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Customer updates</p><h1 className="mt-3 text-5xl tracking-[-0.07em]">Notifications</h1><p className="mt-3 text-sm text-black/60">Status changes generate in-app updates for the customer.</p><section className="mt-8 space-y-3">{error ? <p role="alert" className="border border-red-900/20 bg-red-50 p-5 text-sm text-red-900">Notifications are unavailable. Apply the admin order management migration to Supabase.</p> : data?.length ? data.map((item) => <article key={item.id} className="border border-black/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-medium">{item.title}</h2><time className="text-xs text-black/50">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-2 text-sm text-black/70">{item.body}</p><p className="mt-2 text-xs text-black/45">Customer {item.user_id}{item.order_id ? ` · Order ${item.order_id}` : ""}</p></article>) : <p className="border border-black/10 bg-white p-6 text-sm text-black/60">No customer notifications yet.</p>}</section></div>;
}
