import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import CustomerManagement from "./CustomerManagement";

export default async function AdminUsersPage() {
  if (!(await requireAdmin())) redirect("/login");
  return <div>
    <p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Management</p>
    <h1 className="mt-3 text-5xl tracking-[-0.07em]">Customers</h1>
    <p className="mt-3 max-w-2xl text-sm text-black/60">Invite customers, update their details, and disable or restore account access.</p>
    <CustomerManagement />
  </div>;
}
