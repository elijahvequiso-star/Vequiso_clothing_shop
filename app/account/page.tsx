"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getWishlistItems } from "@/app/data/store";
import { products } from "@/app/data/products";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string; phone?: string; role: string } | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const sync = async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const result = (await response.json()) as { user: typeof user };
      if (result.user?.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }
      setUser(result.user);
      setWishlistIds(getWishlistItems());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [router]);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setLogoutError("We couldn't log you out. Please try again.");
        return;
      }
      setUser(null);
      window.dispatchEvent(new Event("storage"));
      router.push("/");
    } catch {
      setLogoutError("We couldn't log you out. Please try again.");
    }
  };

  if (!user) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7edea] px-4 text-black">
        <div className="border border-black/10 bg-white p-8 text-center">
          <p className="text-2xl tracking-[-0.05em]">Welcome, guest</p>
          <Link href="/login" className="mt-5 inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white">
            Login
          </Link>
        </div>
      </main>
    );
  }

  const wishlistItems = products.filter((product) => wishlistIds.includes(product.id));

  return (
    <main className="bg-[#f7edea] py-16 text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <h1 className="text-5xl leading-none tracking-[-0.07em] sm:text-6xl">Welcome, {user.full_name}</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="border border-black/10 bg-white p-6">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Account</p>
            <nav className="mt-6 space-y-4 text-sm text-black/75">
              <p className="font-medium text-black">Profile</p>
              <Link href="/account/orders" className="block hover:underline">My Orders</Link>
              <p>Wishlist</p>
              <p>Account Settings</p>
              <button type="button" onClick={handleLogout} className="text-left text-black underline-offset-4 hover:underline">Logout</button>
              {logoutError && <p role="alert" className="text-sm text-red-800">{logoutError}</p>}
            </nav>
          </aside>

          <section className="border border-black/10 bg-white p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Wishlist</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {wishlistItems.length === 0 ? (
                <p className="text-black/70">Your wishlist is empty.</p>
              ) : (
                wishlistItems.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`} className="border border-black/10 p-3 hover:bg-[#f8f3f2]">
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-20 overflow-hidden bg-[#f2ece8]">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-lg tracking-[-0.04em] text-black">{product.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-black/60">{product.category}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
