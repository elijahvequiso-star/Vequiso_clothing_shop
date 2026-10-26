import { useSyncExternalStore } from "react";

export type AuthenticatedCustomer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "customer";
  account_status: "active";
};

function subscribeToLocationSearch(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getLocationSearch() {
  return window.location.search;
}

export function useLocationSearch() {
  return useSyncExternalStore(subscribeToLocationSearch, getLocationSearch, () => "");
}

export async function getAuthenticatedCustomer(): Promise<AuthenticatedCustomer | null> {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  if (!response.ok) throw new Error("We could not verify your login. Please try again.");

  const result = await response.json() as { user: AuthenticatedCustomer | null };
  const user = result.user;
  if (!user || user.role !== "customer" || user.account_status !== "active") return null;
  return user;
}

export function getSafeReturnTo(value: string | null, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return fallback;
  }

  const url = new URL(value, "https://elijah-clothingshop.invalid");
  if (url.origin !== "https://elijah-clothingshop.invalid" || url.pathname === "/login" || url.pathname === "/signup") {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getLoginUrl(returnTo: string, reason: "cart" | "checkout" | "view-cart"): string {
  const query = new URLSearchParams({ returnTo: getSafeReturnTo(returnTo, "/"), reason });
  return `/login?${query.toString()}`;
}
