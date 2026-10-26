import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const PAYMENT_PROOFS_BUCKET = "payment-proofs";
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function getUploadErrorMessage(error: { message: string; statusCode?: string }) {
  const message = error.message.toLowerCase();
  if (error.statusCode === "413" || message.includes("file size") || message.includes("payload too large")) {
    return "This receipt is larger than Supabase allows. Choose an image under 5 MB or increase the Supabase Storage file size limit.";
  }
  if (error.statusCode === "400" && (message.includes("mime") || message.includes("content type") || message.includes("type not allowed"))) {
    return "This receipt format is not accepted. Upload a JPEG, PNG, or WebP image.";
  }
  if (error.statusCode === "401" || error.statusCode === "403" || message.includes("row-level security")) {
    return "Receipt storage is not authorized. Check that SUPABASE_SERVICE_ROLE_KEY is configured for this Supabase project.";
  }
  if (error.statusCode === "404" || message.includes("bucket not found")) {
    return "The private payment-proofs storage bucket is unavailable. Run the QR payment submissions migration in Supabase.";
  }
  return "Receipt upload failed. Check your Supabase Storage configuration and try again.";
}

async function ensurePaymentProofsBucket(db: ReturnType<typeof createSupabaseAdminClient>) {
  const storage = db.storage;
  const { data: bucket, error: lookupError } = await storage.getBucket(PAYMENT_PROOFS_BUCKET);
  const updateBucket = () => storage.updateBucket(PAYMENT_PROOFS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(mimeExtensions),
  });
  const isConfigured = (existing: NonNullable<typeof bucket>) =>
    !existing.public
    && existing.file_size_limit === MAX_BYTES
    && Object.keys(mimeExtensions).every((type) => existing.allowed_mime_types?.includes(type));

  if (bucket) {
    if (isConfigured(bucket)) return null;
    const { error } = await updateBucket();
    return error;
  }
  if (lookupError?.statusCode !== "404") return lookupError;

  const { error: createError } = await storage.createBucket(PAYMENT_PROOFS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(mimeExtensions),
  });
  if (!createError) return null;

  if (createError.statusCode === "409") {
    const { data: existingBucket, error: retryError } = await storage.getBucket(PAYMENT_PROOFS_BUCKET);
    if (existingBucket) {
      if (isConfigured(existingBucket)) return null;
      const { error: updateError } = await updateBucket();
      return updateError;
    }
    return retryError ?? createError;
  }
  return createError;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit payment proof." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const orderId = String(form?.get("orderId") ?? "");
  const reference = String(form?.get("reference") ?? "").trim().slice(0, 160);
  const proof = form?.get("proof");
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !(proof instanceof File) || !mimeExtensions[proof.type] || proof.size <= 0 || proof.size > MAX_BYTES) return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP receipt image up to 5 MB." }, { status: 400 });
  try {
    const db = createSupabaseAdminClient();
    const { data: order, error } = await db.from("orders").select("id,user_id,total,payment_method,payment_status,status,order_number").eq("id", orderId).eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("Unable to validate the order for payment proof.", error);
      return NextResponse.json({ error: "QR payment records are unavailable. Apply the QR payment submissions migration in Supabase." }, { status: 503 });
    }
    if (!order || !["gcash", "maya"].includes(order.payment_method ?? "") || order.payment_status !== "pending" || order.status === "cancelled") {
      return NextResponse.json({ error: "This order cannot accept a payment submission." }, { status: 409 });
    }

    const bucketError = await ensurePaymentProofsBucket(db);
    if (bucketError) {
      console.error("Unable to prepare private payment receipt storage.", bucketError);
      return NextResponse.json({ error: getUploadErrorMessage(bucketError) }, { status: 503 });
    }

    const path = `${user.id}/${order.id}/${crypto.randomUUID()}.${mimeExtensions[proof.type]}`;
    const { error: uploadError } = await db.storage.from(PAYMENT_PROOFS_BUCKET)
      .upload(path, proof, { contentType: proof.type, upsert: false });
    if (uploadError) {
      console.error("Payment receipt upload failed.", uploadError);
      return NextResponse.json({ error: getUploadErrorMessage(uploadError) }, { status: 503 });
    }

    const { data: submission, error: insertError } = await db.from("payment_submissions")
      .insert({ order_id: order.id, user_id: user.id, amount: order.total, reference: reference || null, proof_path: path })
      .select("id,status,created_at").single();
    if (insertError) {
      const { error: cleanupError } = await db.storage.from(PAYMENT_PROOFS_BUCKET).remove([path]);
      console.error("Unable to save the uploaded payment proof.", { insertError, cleanupError });
      return NextResponse.json({
        error: insertError.code === "42P01" || insertError.code === "PGRST205"
          ? "The payment submissions table is missing. Run the QR payment submissions migration in Supabase."
          : "Your receipt uploaded, but its payment submission could not be saved. Please try again.",
      }, { status: 500 });
    }

    const { error: activityError } = await db.from("activity_log").insert({
      actor_id: user.id,
      event_type: "payment.qr_submitted",
      message: `QR payment proof submitted for order #${order.order_number}`,
      metadata: { order_id: order.id, submission_id: submission.id },
    });
    if (activityError) console.error("Unable to record payment proof submission activity.", activityError);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Payment proof submission failed unexpectedly.", error);
    return NextResponse.json({ error: "Payment proof service is unavailable. Check the Supabase server settings and try again." }, { status: 503 });
  }
}
