import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import ShippingManagement from "./ShippingManagement";

export default async function AdminShippingPage() {
  if (!(await requireAdmin())) redirect("/login");
  return <div><p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Fulfillment</p><h1 className="mt-3 text-5xl tracking-[-0.07em]">Shipping</h1><p className="mt-3 text-sm text-black/60">Move orders to shipped or delivered and notify customers.</p><ShippingManagement /></div>;
}
