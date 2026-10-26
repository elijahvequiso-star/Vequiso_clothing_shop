import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

const customerStatus = z.enum(["active", "disabled"]);
const createSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120).optional(),
  account_status: customerStatus.optional(),
}).refine((value) => value.full_name !== undefined || value.account_status !== undefined);
const deleteSchema = z.object({ id: z.string().uuid() });

async function setCustomerStatus(id: string, status: z.infer<typeof customerStatus>) {
  const supabase = createSupabaseAdminClient();
  const { data: customer, error: lookupError } = await supabase.from("profiles")
    .select("id, account_status").eq("id", id).eq("role", "customer").maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Unable to find this customer." }, { status: 500 });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: status === "disabled" ? "876000h" : "none",
  });
  if (authError) return NextResponse.json({ error: "Customer access could not be updated." }, { status: 500 });

  const { error: updateError } = await supabase.from("profiles").update({ account_status: status })
    .eq("id", id).eq("role", "customer");
  if (updateError) {
    const { error: rollbackError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: customer.account_status === "disabled" ? "876000h" : "none",
    });
    return NextResponse.json({
      error: rollbackError
        ? "Customer status could not be saved, and login access could not be restored. Check this account in Supabase."
        : "Customer status could not be saved.",
    }, { status: 500 });
  }
  return null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const search = new URL(request.url).searchParams.get("search")?.trim().replace(/[,%()]/g, "") ?? "";
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("profiles")
    .select("id, full_name, email, account_status, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load customers." }, { status: 500 });
  return NextResponse.json({ customers: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid customer name and email address." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.full_name, role: "customer" },
  });
  if (error || !data.user) {
    const duplicate = error?.message.toLowerCase().includes("already")
      || error?.message.toLowerCase().includes("registered")
      || error?.message.toLowerCase().includes("exists");
    return NextResponse.json({
      error: duplicate ? "An account with this email already exists." : "Customer invitation could not be sent. Check the Supabase email configuration.",
    }, { status: duplicate ? 409 : 502 });
  }
  return NextResponse.json({ message: "Customer invitation sent.", customerId: data.user.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid customer update." }, { status: 400 });

  const { id, account_status, full_name } = parsed.data;
  if (account_status) {
    const statusResponse = await setCustomerStatus(id, account_status);
    if (statusResponse) return statusResponse;
  }
  if (full_name !== undefined) {
    const { data, error } = await createSupabaseAdminClient().from("profiles").update({ full_name })
      .eq("id", id).eq("role", "customer").select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "Customer name could not be saved." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid customer account." }, { status: 400 });
  const statusResponse = await setCustomerStatus(parsed.data.id, "disabled");
  if (statusResponse) return statusResponse;
  return NextResponse.json({ ok: true, message: "Customer account disabled. Order history has been retained." });
}
