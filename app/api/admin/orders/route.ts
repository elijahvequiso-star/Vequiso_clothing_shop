import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";
import { sendStoreEmail } from "@/app/lib/email";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(orderStatuses).optional(),
  courier_name: z.string().trim().max(120).nullable().optional(),
  tracking_number: z.string().trim().max(160).nullable().optional(),
}).refine((value) => value.status || value.courier_name !== undefined || value.tracking_number !== undefined);

const allowedTransitions: Record<(typeof orderStatuses)[number], (typeof orderStatuses)[number][]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const search = (params.get("search")?.trim() ?? "").replace(/[,%()]/g, "");
  const status = params.get("status");
  const statuses = (params.get("statuses") ?? "").split(",").filter((value) => orderStatuses.includes(value as (typeof orderStatuses)[number]));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? 25) || 25));
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("orders")
    .select("id, order_number, user_id, customer_name, customer_email, shipping_address, total, payment_status, payment_method, payment_reference, payment_date, status, courier_name, tracking_number, shipped_at, delivered_at, created_at, order_items(id, product_name, size, color, quantity, unit_price)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,order_number.eq.${Number(search) || -1}`);
  if (status && orderStatuses.includes(status as (typeof orderStatuses)[number])) query = query.eq("status", status);
  if (statuses.length) query = query.in("status", statuses);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  return NextResponse.json({ orders: data ?? [], total: count ?? 0, page, pageSize });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid order update." }, { status: 400 });

  const { id, status, courier_name, tracking_number } = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { data: current, error: readError } = await supabase.from("orders").select("id, user_id, status, order_number").eq("id", id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Unable to read the current order." }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (status && status !== current.status && !allowedTransitions[current.status as (typeof orderStatuses)[number]]?.includes(status)) {
    return NextResponse.json({ error: `The order cannot move from ${current.status} to ${status}.` }, { status: 409 });
  }
  if (status === current.status && courier_name === undefined && tracking_number === undefined) {
    return NextResponse.json({ error: "Choose a new status or change shipping details." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const changes: Record<string, string | null> = { updated_at: now };
  if (status && status !== current.status) changes.status = status;
  if (courier_name !== undefined) changes.courier_name = courier_name || null;
  if (tracking_number !== undefined) changes.tracking_number = tracking_number || null;
  if (status === "shipped" && current.status !== "shipped") changes.shipped_at = now;
  if (status === "delivered" && current.status !== "delivered") changes.delivered_at = now;

  const update = supabase.from("orders").update(changes).eq("id", id).eq("status", current.status);
  const { data: order, error } = await update.select("id, order_number, status, courier_name, tracking_number, shipped_at, delivered_at, updated_at").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to save the order update. Apply the admin order migration if shipping fields are missing." }, { status: 400 });
  if (!order) return NextResponse.json({ error: "This order changed in another session. Refresh and try again." }, { status: 409 });

  if (status && status !== current.status) {
    const { error: historyError } = await supabase.from("order_status_history").insert({
      order_id: id,
      previous_status: current.status,
      new_status: status,
      changed_by: admin.user.id,
      created_at: now,
    });
    if (historyError) return NextResponse.json({ error: "Order status was saved, but its audit history could not be recorded. Apply the admin order migration." }, { status: 500 });

    const messages: Record<(typeof orderStatuses)[number], { title: string; body: string }> = {
      pending: { title: "Order update", body: "Your order is pending." },
      confirmed: { title: "Order confirmed", body: "Your order has been confirmed." },
      processing: { title: "Order being prepared", body: "Your order is being processed." },
      shipped: { title: "Order shipped", body: `Your order has been shipped.${order.tracking_number ? ` Tracking number: ${order.tracking_number}.` : ""}` },
      delivered: { title: "Order delivered", body: "Your order has been marked as delivered." },
      cancelled: { title: "Order cancelled", body: "Your order has been cancelled. Please check your order details." },
    };
    const { title, body: notificationBody } = messages[status];
    const { error: notificationError } = await supabase.from("notifications").upsert({
      user_id: current.user_id,
      order_id: id,
      title,
      body: notificationBody,
      dedupe_key: `${id}:${current.status}:${status}`,
    }, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (notificationError) return NextResponse.json({ error: "Order status and audit history were saved, but the customer notification could not be created. Apply the admin order migration." }, { status: 500 });

    const { data: customer } = await supabase.from("profiles").select("email").eq("id", current.user_id).maybeSingle();
    let emailStatus: "sent" | "not_configured" | "failed" = "not_configured";
    if (customer?.email) {
      const trackingLine = status === "shipped" && order.tracking_number ? ` Tracking number: ${order.tracking_number}.` : "";
      const emailBody = `${notificationBody}${trackingLine}`;
      emailStatus = await sendStoreEmail({
        to: customer.email,
        subject: `Elijah ClothingShop order #${order.order_number}: ${title}`,
        text: emailBody,
        html: `<div style="font-family:Arial,sans-serif;color:#241a17;max-width:560px;margin:0 auto;padding:24px"><p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#76625d">Elijah ClothingShop</p><h1 style="font-size:24px">${escapeHtml(title)}</h1><p>${escapeHtml(emailBody)}</p><p>Order #${order.order_number}</p></div>`,
      });
    }

    await supabase.from("activity_log").insert({
      actor_id: admin.user.id,
      event_type: "order.status_changed",
      message: `Order #${current.order_number} changed from ${current.status} to ${status}`,
      metadata: { order_id: id, previous_status: current.status, new_status: status },
    });
    return NextResponse.json({ order, emailStatus });
  }

  return NextResponse.json({ order });
}
