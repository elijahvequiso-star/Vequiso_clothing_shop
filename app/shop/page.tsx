"use client";

import { useEffect, useMemo, useState } from "react";
import SearchBar from "@/app/components/SearchBar";
import ProductCard from "@/app/components/ProductCard";
import { allCategories, products as fallbackProducts, Product } from "@/app/data/products";

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price Low to High" },
  { value: "price-high", label: "Price High to Low" },
] as const;

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json() as { products?: Product[] };
        if (result.products) setProducts(result.products);
      })
      .catch(() => undefined);
  }, []);

  const categories = useMemo(() => [...new Set([...allCategories.slice(1), ...products.map((product) => product.category)])], [products]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const byCategory =
      selectedCategory === "All"
        ? products
        : products.filter((product) => product.category === selectedCategory);

    const bySearch = normalized
      ? byCategory.filter((product) => product.name.toLowerCase().includes(normalized))
      : byCategory;

    const sorted = [...bySearch];
    if (sort === "price-low") {
      sorted.sort((a, b) => a.price - b.price);
    }
    if (sort === "price-high") {
      sorted.sort((a, b) => b.price - a.price);
    }
    return sorted;
  }, [products, search, selectedCategory, sort]);

  return (
    <main className="bg-[#f7edea] py-12 text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Shop Elijah</p>
            <h1 className="mt-3 text-5xl leading-none tracking-[-0.07em] sm:text-6xl">Shop Elijah</h1>
          </div>
          <div className="w-full max-w-md">
            <SearchBar value={search} onChange={setSearch} placeholder="Search products" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {["All", ...categories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`border px-3 py-2 text-[10px] uppercase tracking-[0.24em] transition-colors ${
                  selectedCategory === category
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black/75 hover:border-black/25"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-black/70">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as (typeof sortOptions)[number]["value"])}
              className="border border-black/10 bg-[#f9f5f4] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-black outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-10">
          {filteredProducts.length === 0 ? (
            <div className="border border-black/10 bg-white px-6 py-12 text-center text-lg text-black/70">
              No products found.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
