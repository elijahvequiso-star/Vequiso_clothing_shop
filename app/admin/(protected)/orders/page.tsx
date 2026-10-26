import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import OrderManagement from "./OrderManagement";

export default async function AdminOrdersPage() {
  if (!(await requireAdmin())) redirect("/login");
  return <div><p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Fulfillment</p><h1 className="mt-3 text-5xl tracking-[-0.07em]">Orders</h1><p className="mt-3 max-w-2xl text-sm text-black/60">Review customer orders, update their fulfillment status, and add shipping details.</p><OrderManagement /></div>;
}
