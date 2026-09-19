"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCartItems, getCurrentUser } from "@/app/data/store";

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

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const sync = () => {
      const cart = getCartItems();
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
      const currentUser = getCurrentUser();
      setUserName(currentUser?.fullName ?? "");
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
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
          <Link
            href={userName ? "/account" : "/login"}
            aria-label="Account"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]"
          >
            <IconUser />
            <span>{userName ? "Account" : "Login"}</span>
          </Link>
          <Link href="/cart" aria-label="Shopping bag" className="relative transition-transform hover:scale-105">
            <IconBag />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5d433a] px-1 text-[8px] font-medium text-white">
                {cartCount}
              </span>
            )}
          </Link>
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
              <Link key={item.href} href={item.href} className={pathname === item.href ? "text-black" : ""}>
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-4">
              <Link href="/shop" className="flex items-center gap-2">
                <IconSearch />
                Search
              </Link>
              <Link href={userName ? "/account" : "/login"} className="flex items-center gap-2">
                <IconUser />
                {userName ? "Profile" : "Login"}
              </Link>
              <Link href="/cart" className="flex items-center gap-2">
                <IconBag />
                Bag ({cartCount})
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
