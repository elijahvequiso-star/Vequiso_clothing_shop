import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";
import PaymentManagement from "./PaymentManagement";

export default async function AdminPaymentsPage() {
  if (!(await requireAdmin())) redirect("/login");
  const supabase = createSupabaseAdminClient();
  const [{ data, error }, { data: submissions, error: submissionError }] = await Promise.all([supabase.from("orders")
    .select("id, order_number, customer_name, customer_email, total, payment_method, payment_status, payment_reference, payment_date, status, created_at")
    .order("created_at", { ascending: false }).limit(200), supabase.from("payment_submissions").select("id,order_id,user_id,amount,reference,proof_path,status,created_at,orders(order_number,customer_name,customer_email,payment_method)").order("created_at", { ascending: false }).limit(200)]);
  const proofRows = await Promise.all((submissions ?? []).map(async (submission) => { const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(submission.proof_path, 900); return { ...submission, orders: Array.isArray(submission.orders) ? submission.orders[0] ?? null : submission.orders, proof_url: signed?.signedUrl ?? null }; }));
  return <div><p className="text-[10px] uppercase tracking-[0.3em] text-black/50">Payments</p><h1 className="mt-3 text-5xl tracking-[-0.07em]">Payment review</h1><p className="mt-3 max-w-3xl text-sm text-black/60">Review customer QR receipts before confirming or rejecting a payment. Cash on delivery can be recorded after delivery.</p>{(error || submissionError) ? <p role="alert" className="mt-8 border border-red-900/20 bg-red-50 p-5 text-sm text-red-900">Payment records could not be loaded. Apply the order management and QR payment migrations in Supabase.</p> : <PaymentManagement orders={data ?? []} submissions={proofRows} />}</div>;
}
