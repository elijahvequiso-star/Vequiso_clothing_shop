import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

const schema = z.object({ id: z.string().uuid(), payment_reference: z.string().trim().max(160).optional() });
const reviewSchema = z.object({ submissionId: z.string().uuid(), decision: z.enum(["approved", "rejected"]) });

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const payload = await request.json().catch(() => null);
  const review = reviewSchema.safeParse(payload);
  if (review.success) {
    const supabase = createSupabaseAdminClient();
    const { data: submission, error: submissionError } = await supabase.from("payment_submissions").select("id,order_id,user_id,reference,status,orders(order_number,status)").eq("id", review.data.submissionId).maybeSingle();
    if (submissionError) return NextResponse.json({ error: "QR payment review is unavailable. Apply the QR payment migration." }, { status: 503 });
    if (!submission || submission.status !== "pending") return NextResponse.json({ error: "This payment submission has already been reviewed." }, { status: 409 });
    const now = new Date().toISOString();
    if (review.data.decision === "approved") {
      const { data: updatedOrder, error: orderError } = await supabase.from("orders").update({ payment_status: "paid", status: "confirmed", payment_date: now, payment_reference: submission.reference, updated_at: now }).eq("id", submission.order_id).in("payment_method", ["gcash", "maya"]).eq("payment_status", "pending").select("id").maybeSingle();
      if (orderError || !updatedOrder) return NextResponse.json({ error: "Order payment is no longer pending, so this receipt cannot be confirmed." }, { status: 409 });
      const order = Array.isArray(submission.orders) ? submission.orders[0] : submission.orders;
      if (order?.status === "pending") await supabase.from("order_status_history").insert({ order_id: submission.order_id, previous_status: "pending", new_status: "confirmed", changed_by: admin.user.id });
    }
    if (review.data.decision === "rejected") {
      const { error: orderError } = await supabase.from("orders").update({ payment_status: "failed", updated_at: now }).eq("id", submission.order_id).in("payment_method", ["gcash", "maya"]).eq("payment_status", "pending");
      if (orderError) return NextResponse.json({ error: "Payment status could not be updated. Refresh and try again." }, { status: 500 });
    }
    const { data: updatedSubmission, error: reviewError } = await supabase.from("payment_submissions").update({ status: review.data.decision, reviewed_by: admin.user.id, reviewed_at: now }).eq("id", submission.id).eq("status", "pending").select("id").maybeSingle();
    if (reviewError || !updatedSubmission) return NextResponse.json({ error: "Payment was updated concurrently. Refresh and check its current status." }, { status: 409 });
    const approved = review.data.decision === "approved";
    await supabase.from("notifications").upsert({ user_id: submission.user_id, order_id: submission.order_id, title: approved ? "Payment confirmed" : "Payment rejected", body: approved ? "Your payment was verified. Your order is confirmed." : "Your payment receipt was not accepted and the payment is marked failed. Please contact us for help.", dedupe_key: `payment:${submission.id}:${review.data.decision}` }, { onConflict: "dedupe_key", ignoreDuplicates: true });
    await supabase.from("activity_log").insert({ actor_id: admin.user.id, event_type: `payment.qr_${review.data.decision}`, message: `QR payment ${review.data.decision} for order #${(submission.orders as { order_number?: number } | null)?.order_number ?? "?"}`, metadata: { order_id: submission.order_id, submission_id: submission.id } });
    return NextResponse.json({ submission: { id: submission.id, status: review.data.decision } });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid payment review." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: order, error: readError } = await supabase.from("orders")
    .select("id, order_number, status, payment_status, payment_method")
    .eq("id", parsed.data.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Unable to read this payment." }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.payment_method !== "cash_on_delivery" || order.status !== "delivered" || order.payment_status !== "pending") {
    return NextResponse.json({ error: "Only a delivered cash-on-delivery order can be marked collected here. Online payments require provider confirmation." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase.from("orders").update({
    payment_status: "paid",
    payment_date: now,
    payment_reference: parsed.data.payment_reference || null,
    updated_at: now,
  }).eq("id", order.id).eq("payment_status", "pending").select("id, order_number, payment_status, payment_date, payment_reference").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to record payment. Apply the admin order migration if payment fields are missing." }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "Payment changed in another session. Refresh and try again." }, { status: 409 });

  await supabase.from("activity_log").insert({
    actor_id: admin.user.id,
    event_type: "payment.cash_collected",
    message: `Cash payment recorded for order #${order.order_number}`,
    metadata: { order_id: order.id, payment_reference: parsed.data.payment_reference || null },
  });
  return NextResponse.json({ payment: updated });
}
