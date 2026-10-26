import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import ProductManagement from "./ProductManagement";

export default async function AdminProductsPage() {
  if (!(await requireAdmin())) redirect("/login");
  return <div><p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Store catalog</p><h1 className="mt-3 text-5xl tracking-[-0.07em]">Products</h1><p className="mt-3 text-sm text-black/60">Browse every storefront product, set a regular price, and preview the discounted price customers will pay.</p><ProductManagement /></div>;
}
