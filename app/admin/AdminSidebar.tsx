"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", detail: "Store overview", mark: "01" },
  { href: "/admin/orders", label: "Orders", detail: "Order management", mark: "02" },
  { href: "/admin/users", label: "Customers", detail: "Customer directory", mark: "03" },
  { href: "/admin/notifications", label: "Notifications", detail: "Customer updates", mark: "04" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return <aside className="border-b border-white/10 bg-[#201b19] p-5 text-white sm:p-7 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-white/10 lg:p-7">
    <div className="flex items-center gap-3 border-b border-white/10 pb-6">
      <div className="flex h-11 w-11 items-center justify-center border border-[#c6a995]/55 font-serif text-xl text-[#ead7ca]">E</div>
      <div><p className="text-[10px] uppercase tracking-[0.22em] text-[#d9c5b8]">Elijah Clothing</p><p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-white/40">Administrator</p></div>
    </div>
    <p className="mb-3 mt-6 text-[9px] uppercase tracking-[0.24em] text-white/35">Workspace</p>
    <nav aria-label="Admin dashboard" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(`${item.href}/`));
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`group flex min-w-0 items-center gap-3 border px-3 py-3 transition-colors sm:px-4 ${active ? "border-[#c6a995]/35 bg-[#c6a995]/10 text-white" : "border-transparent text-white/65 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"}`}>
          <span className={`hidden w-6 text-[9px] tracking-wider sm:block ${active ? "text-[#d9c5b8]" : "text-white/30"}`}>{item.mark}</span>
          <span className="min-w-0"><span className="block text-[10px] font-medium uppercase tracking-[0.14em]">{item.label}</span><span className="mt-1 block truncate text-[10px] tracking-normal text-white/40">{item.detail}</span></span>
          {active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[#d9c5b8] lg:block" />}
        </Link>;
      })}
    </nav>
    <div className="mt-6 border-t border-white/10 pt-4 lg:mt-8"><p className="mb-3 text-[9px] uppercase tracking-[0.24em] text-white/35">Account</p><div className="flex items-center gap-3 px-3 py-2 text-white/65 sm:px-4"><span className="w-6 text-[9px] text-white/30 sm:block">05</span><LogoutButton /></div></div>
    <p className="mt-6 hidden text-[9px] leading-5 tracking-wide text-white/25 lg:block">ELIJAH CLOTHING SHOP<br />ADMINISTRATION PORTAL</p>
  </aside>;
}
