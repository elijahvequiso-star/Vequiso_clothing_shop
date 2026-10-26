import { redirect } from "next/navigation";
import AdminSidebar from "../AdminSidebar";
import { requireAdmin } from "@/app/lib/auth";

export default async function ProtectedAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!(await requireAdmin())) redirect("/login");
  return <div className="min-h-screen bg-[#f7edea] text-black lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <AdminSidebar />
    <section className="min-w-0 p-5 sm:p-8 lg:p-12">{children}</section>
  </div>;
}
