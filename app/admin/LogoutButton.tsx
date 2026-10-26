"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const logout = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("We couldn't log you out. Please try again.");
      router.replace("/login");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "We couldn't log you out. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return <div>
    <button type="button" onClick={logout} disabled={busy} className="whitespace-nowrap text-left hover:text-[#d7b7a8] disabled:opacity-50">{busy ? "Logging out…" : "Logout"}</button>
    {error && <p role="alert" className="mt-2 max-w-48 text-xs text-red-300">{error}</p>}
  </div>;
}
