"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice, Product } from "@/app/data/products";

type ManagedProduct = Product & { regularPrice: number; discountPercent: number };
type Draft = { regularPrice: string; discountPercent: string };
const reducedPrice = (price: number, discount: number) => Math.round(price * (1 - discount / 100) * 100) / 100;

export default function ProductManagement() {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [message, setMessage] = useState("Loading products…");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/products", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { products?: ManagedProduct[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to load products.");
        if (active) { setProducts(result.products ?? []); setMessage(""); }
      })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load products."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshIndex]);

  const categories = useMemo(() => ["All products", ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => products.filter((product) =>
    (category === "All products" || product.category === category) && product.name.toLowerCase().includes(search.trim().toLowerCase())), [category, products, search]);

  const save = async (product: ManagedProduct) => {
    const draft = drafts[product.id] ?? { regularPrice: String(product.regularPrice), discountPercent: String(product.discountPercent) };
    const regularPrice = Number(draft.regularPrice);
    const discountPercent = Number(draft.discountPercent);
    if (!Number.isFinite(regularPrice) || regularPrice < 0 || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setMessage("Enter a valid regular price and a discount from 0% to 100%."); return;
    }
    setBusy(product.id); setMessage("");
    try {
      const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, regular_price: regularPrice, discount_percent: discountPercent }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to update product price.");
      setMessage(`${product.name} saved at ${formatPrice(reducedPrice(regularPrice, discountPercent))}. The storefront price is updated.`);
      setLoading(true); setRefreshIndex((value) => value + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update product price."); }
    finally { setBusy(""); }
  };

  if (loading) return <p className="mt-8 border border-black/10 bg-white p-6 text-sm text-black/60">Loading store catalog…</p>;
  return <section className="mt-8">
    <div className="mb-6 grid gap-3 border border-black/10 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
      <label className="sr-only" htmlFor="product-search">Search products</label><input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the store catalog" className="w-full border border-black/10 bg-[#f9f5f4] px-4 py-3 text-sm outline-none focus:border-black/40" />
      <label className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-black/55">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="border border-black/10 bg-[#f9f5f4] px-3 py-3 text-xs text-black">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    {message && <p role="status" className="mb-4 border border-black/10 bg-white p-3 text-sm">{message}</p>}
    <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-black/45"><span>Store catalog</span><span>{visibleProducts.length} products</span></div>
    {visibleProducts.length === 0 ? <p className="border border-black/10 bg-white p-6 text-sm text-black/60">No products match this search.</p> : <div className="space-y-3">{visibleProducts.map((product) => {
      const draft = drafts[product.id] ?? { regularPrice: String(product.regularPrice), discountPercent: String(product.discountPercent) };
      const base = Number(draft.regularPrice); const discount = Number(draft.discountPercent);
      const preview = Number.isFinite(base) && Number.isFinite(discount) ? reducedPrice(base, discount) : 0;
      const update = (change: Partial<Draft>) => setDrafts((current) => ({ ...current, [product.id]: { ...draft, ...change } }));
      return <article key={product.id} className="grid gap-4 border border-black/10 bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_140px_130px_minmax(150px,0.8fr)_auto] lg:items-center">
        <div className="min-w-0"><p className="truncate text-base font-medium">{product.name}</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-black/45">{product.category}</p></div>
        <label className="text-[10px] uppercase tracking-[0.14em] text-black/50">Regular price<input type="number" min="0" step="0.01" value={draft.regularPrice} onChange={(event) => update({ regularPrice: event.target.value })} className="mt-1 w-full border border-black/10 bg-[#f9f5f4] px-3 py-2.5 text-sm text-black" /></label>
        <label className="text-[10px] uppercase tracking-[0.14em] text-black/50">Discount %<input type="number" min="0" max="100" step="1" value={draft.discountPercent} onChange={(event) => update({ discountPercent: event.target.value })} className="mt-1 w-full border border-black/10 bg-[#f9f5f4] px-3 py-2.5 text-sm text-black" /></label>
        <div className="border-l-2 border-[#a67d68] pl-3"><p className="text-[9px] uppercase tracking-[0.18em] text-black/45">Customer pays</p><p className="mt-1 text-xl font-medium tracking-tight">{formatPrice(preview)}</p>{discount > 0 && <p className="mt-1 text-[10px] text-black/45">{formatPrice(base)} less {formatPrice(base - preview)}</p>}</div>
        <button type="button" onClick={() => void save(product)} disabled={busy === product.id} className="bg-[#221c19] px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#513e35] disabled:opacity-50">{busy === product.id ? "Saving…" : "Save price"}</button>
      </article>;
    })}</div>}
  </section>;
}
