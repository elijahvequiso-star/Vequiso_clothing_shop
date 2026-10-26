import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

export async function GET() {
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });

  const supabase = createSupabaseAdminClient();
  const [{ count: totalUsers }, { count: verifiedUsers }, { count: totalProducts }, { count: activeProducts }, { count: totalOrders }, { data: orders }, { data: activity }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).not("last_login_at", "is", null),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("status, total"),
    supabase.from("activity_log").select("id, event_type, message, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const revenue = (orders ?? []).reduce((sum, order) => sum + Number(order.total), 0);
  const statuses = (orders ?? []).reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, {});

  return NextResponse.json({ totalUsers: totalUsers ?? 0, verifiedUsers: verifiedUsers ?? 0, unverifiedUsers: Math.max(0, (totalUsers ?? 0) - (verifiedUsers ?? 0)), totalProducts: totalProducts ?? 0, activeProducts: activeProducts ?? 0, totalOrders: totalOrders ?? 0, revenue, statuses, activity: activity ?? [] });
}