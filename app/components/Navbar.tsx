"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCartItems } from "@/app/data/store";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16L21 21" strokeLinecap="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setLogoutError("We couldn't log you out. Please try again.");
        return;
      }
      setUserName("");
      setCartCount(0);
      setMobileOpen(false);
      window.dispatchEvent(new Event("storage"));
      router.push("/");
    } catch {
      setLogoutError("We couldn't log you out. Please try again.");
    }
  };

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to verify session.");
        const result = await response.json() as { user: { id: string; full_name: string; role: string } | null };
        if (!active) return;
        setUserName(result.user?.full_name ?? "");
        const cart = result.user?.role === "customer" ? getCartItems(result.user.id) : [];
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
      } catch {
        if (!active) return;
        setUserName("");
        setCartCount(0);
      }
    };

    void sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      active = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7edea]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="text-sm font-medium tracking-[0.2em] text-black uppercase">
          Elijah ClothingShop
        </Link>

        <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.24em] text-black/70 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-black ${pathname === item.href ? "text-black" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 text-black md:flex">
          <Link href="/shop" aria-label="Search products" className="transition-transform hover:scale-105">
            <IconSearch />
          </Link>
          {!userName && (
            <Link
              href="/login"
              aria-label="Login"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]"
            >
              <IconUser />
              <span>Login</span>
            </Link>
          )}
          {userName ? (
            <details className="group relative">
              <summary aria-label="Shopping bag and orders" className="relative flex cursor-pointer list-none items-center transition-transform hover:scale-105 [&::-webkit-details-marker]:hidden">
                <IconBag />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5d433a] px-1 text-[8px] font-medium text-white">
                    {cartCount}
                  </span>
                )}
              </summary>
              <div className="absolute right-0 top-full z-50 mt-3 w-44 border border-black/10 bg-white p-2 text-[10px] uppercase tracking-[0.16em] shadow-lg">
                <Link href="/cart" className="block px-3 py-3 hover:bg-[#f7edea]">View Cart</Link>
                <Link href="/account/orders" className="block px-3 py-3 hover:bg-[#f7edea]">My Orders</Link>
              </div>
            </details>
          ) : (
            <Link href="/cart" aria-label="Shopping bag" className="relative transition-transform hover:scale-105">
              <IconBag />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5d433a] px-1 text-[8px] font-medium text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          {userName && (
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
              <IconLogout />
              <span>Log out</span>
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="inline-flex items-center justify-center rounded-full border border-black/10 p-2 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
        >
          <IconMenu />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-black/10 bg-[#f7edea] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4 text-[11px] uppercase tracking-[0.24em] text-black/75">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={pathname === item.href ? "text-black" : ""}>
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-4">
              <Link href="/shop" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <IconSearch />
                Search
              </Link>
              {!userName && (
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em]">
                  <IconUser />
                  Login
                </Link>
              )}
              {userName ? (
                <details className="group relative">
                  <summary aria-label="Shopping bag and orders" className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                    <IconBag />
                    Bag ({cartCount})
                  </summary>
                  <div className="absolute right-0 top-full z-50 mt-3 w-40 border border-black/10 bg-white p-2 text-[10px] uppercase tracking-[0.16em] shadow-lg">
                    <Link href="/cart" onClick={() => setMobileOpen(false)} className="block px-3 py-3 hover:bg-[#f7edea]">View Cart</Link>
                    <Link href="/account/orders" onClick={() => setMobileOpen(false)} className="block px-3 py-3 hover:bg-[#f7edea]">My Orders</Link>
                  </div>
                </details>
              ) : (
                <Link href="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <IconBag />
                  Bag ({cartCount})
                </Link>
              )}
            </div>
            {userName && (
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 border-t border-black/10 pt-4 text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                <IconLogout />
                <span>Log out</span>
              </button>
            )}
            {logoutError && <p role="alert" className="text-sm normal-case tracking-normal text-red-800">{logoutError}</p>}
          </nav>
        </div>
      )}
      {logoutError && !mobileOpen && <p role="alert" className="px-4 pb-3 text-right text-xs text-red-800">{logoutError}</p>}
    </header>
  );
}
