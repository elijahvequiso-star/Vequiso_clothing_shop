import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import CustomerOrders from "./CustomerOrders";

export default async function CustomerOrdersPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") redirect("/admin/dashboard");
  if (!profile || profile.account_status !== "active") redirect("/login");
  return <main className="min-h-[70vh] bg-[#f7edea] px-4 py-14 text-black sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/account" className="text-xs uppercase tracking-[0.2em] text-black/55">← Account</Link><h1 className="mt-5 text-5xl tracking-[-0.07em]">My Orders</h1><CustomerOrders /></div></main>;
}
