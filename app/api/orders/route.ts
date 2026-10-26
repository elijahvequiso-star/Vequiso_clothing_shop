import { NextResponse } from "next/server";
import { z } from "zod";
import { products } from "@/app/data/products";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { isMissingProductPriceSettingsTable } from "@/app/lib/product-pricing";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/app/lib/supabase/server";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  address: z.string().trim().min(5).max(250),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  paymentMethod: z.enum(["cash_on_delivery", "gcash", "maya"]).default("cash_on_delivery"),
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    size: z.string().min(1).max(20),
    color: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(40),
});

function isMissingDatabaseFunction(error: { code?: string }) {
  return error.code === "42883" || error.code === "PGRST202";
}

function isMissingOrderSchema(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204";
}

function getMissingOrderColumn(error: { message: string }): string | null {
  const match = error.message.match(/column ["']?([a-z_]+)["']? of ["']?orders["']?/i)
    ?? error.message.match(/column ["']?([a-z_]+)["']? does not exist/i);
  return match?.[1] ?? null;
}

async function restoreStock(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  changes: Array<{ id: string; quantity: number }>,
) {
  const results = await Promise.all(changes.map(({ id, quantity }) =>
    admin.rpc("adjust_product_stock", { p_product_id: id, p_quantity: quantity, p_direction: 1 }),
  ));
  const failed = results.some(({ data, error }) => error || !data);
  if (failed) console.error("Unable to fully restore inventory after a failed order.", results);
  return !failed;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("orders")
    .select("id, order_number, total, status, payment_status, payment_method, courier_name, tracking_number, shipped_at, delivered_at, created_at, order_items(id, product_name, size, color, quantity, unit_price)")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) {
    console.error("Unable to load customer orders.", error);
    return NextResponse.json({ error: "Unable to load your orders. Please try again later." }, { status: 500 });
  }

  const orders = data ?? [];
  const warnings: string[] = [];
  const orderIds = orders.map((order) => order.id);
  let statusHistory: Array<{ id: string; order_id: string; previous_status: string | null; new_status: string; created_at: string }> = [];
  if (orderIds.length > 0) {
    const { data: history, error: historyError } = await supabase.from("order_status_history")
      .select("id, order_id, previous_status, new_status, created_at")
      .in("order_id", orderIds).order("created_at", { ascending: true });
    if (historyError) {
      console.error("Order history loaded without status updates.", historyError);
      warnings.push("Order status updates are temporarily unavailable.");
    } else {
      statusHistory = history ?? [];
    }
  }

  const { data: notifications, error: notificationError } = await supabase.from("notifications")
    .select("id, order_id, title, body, read_at, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (notificationError) {
    console.error("Order history loaded without customer notifications.", notificationError);
    warnings.push("Order notifications are temporarily unavailable.");
  }

  const historyByOrder = new Map<string, typeof statusHistory>();
  for (const entry of statusHistory) {
    const entries = historyByOrder.get(entry.order_id) ?? [];
    entries.push(entry);
    historyByOrder.set(entry.order_id, entries);
  }

  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      order_status_history: historyByOrder.get(order.id) ?? [],
    })),
    notifications: notifications ?? [],
    warnings,
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in before placing an order." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check your delivery details and cart items." }, { status: 400 });

  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: profile, error: profileError } = await sessionClient.from("profiles")
      .select("id, role, account_status, email, full_name")
      .eq("id", user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "customer" || profile.account_status !== "active") {
      return NextResponse.json({ error: "This account cannot place customer orders." }, { status: 403 });
    }
    if (parsed.data.email !== profile.email.toLowerCase()) {
      return NextResponse.json({ error: "Use the email address on your customer account for order updates." }, { status: 400 });
    }

    const requested = parsed.data.items;
    const productIds = [...new Set(requested.map((item) => item.productId))];
    const admin = createSupabaseAdminClient();
    const { data: databaseProducts, error: productError } = await admin.from("products")
      .select("id, name, price, image, active, stock, sizes, colors")
      .in("id", productIds);
    if (productError) return NextResponse.json({ error: "The product catalog is unavailable. Please try again later." }, { status: 503 });
    const { data: priceSettings, error: priceSettingsError } = await admin.from("product_price_settings")
      .select("product_id, regular_price, discount_percent").in("product_id", productIds);
    if (priceSettingsError && !isMissingProductPriceSettingsTable(priceSettingsError)) {
      return NextResponse.json({ error: "Product prices are unavailable. Please try again later." }, { status: 503 });
    }
    const settingsByProduct = new Map((priceSettings ?? []).map((setting) => [setting.product_id, setting]));
    const databaseCatalog = new Map((databaseProducts ?? []).map((product) => [product.id, product]));
    const staticCatalog = new Map(products.map((product) => [product.id, product]));
    const catalog = new Map(productIds.map((id) => [id, databaseCatalog.get(id) ?? staticCatalog.get(id)]));
    if ([...catalog.values()].some((product) => !product)) return NextResponse.json({ error: "One or more items are no longer available." }, { status: 400 });

    const orderItems = requested.map((item) => {
      const product = catalog.get(item.productId)!;
      if ("active" in product && !product.active) return null;
      if (!product.sizes.includes(item.size) || !product.colors.includes(item.color)) return null;
      const setting = settingsByProduct.get(product.id);
      const unitPrice = setting
        ? Math.round(Number(setting.regular_price) * (1 - Number(setting.discount_percent) / 100) * 100) / 100
        : Number(product.price);
      return {
        product_id: product.id,
        product_name: product.name,
        image: product.image,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: unitPrice,
      };
    });
    if (orderItems.some((item) => !item)) return NextResponse.json({ error: "One or more selected sizes or colors are unavailable." }, { status: 400 });

    const validItems = orderItems as NonNullable<(typeof orderItems)[number]>[];
    const subtotal = validItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const shippingFee = subtotal > 0 ? 100 : 0;
    const stockChanges: Array<{ id: string; quantity: number }> = [];
    const quantitiesByProduct = new Map<string, number>();
    for (const item of validItems) quantitiesByProduct.set(item.product_id, (quantitiesByProduct.get(item.product_id) ?? 0) + item.quantity);
    for (const [productId, quantity] of quantitiesByProduct) {
      const databaseProduct = databaseCatalog.get(productId);
      if (!databaseProduct) continue;
      if (databaseProduct.stock < quantity) {
        if (!(await restoreStock(admin, stockChanges))) {
          return NextResponse.json({ error: "Stock could not be fully restored after an inventory conflict. Contact the store administrator." }, { status: 500 });
        }
        return NextResponse.json({ error: `${databaseProduct.name} does not have enough stock.` }, { status: 409 });
      }
      const { data: stockAdjusted, error: stockError } = await admin.rpc("adjust_product_stock", { p_product_id: productId, p_quantity: quantity, p_direction: -1 });
      if (stockError || !stockAdjusted) {
        if (!(await restoreStock(admin, stockChanges))) {
          return NextResponse.json({ error: "Stock could not be fully restored after an inventory conflict. Contact the store administrator." }, { status: 500 });
        }
        if (stockError && isMissingDatabaseFunction(stockError)) {
          return NextResponse.json({ error: "Inventory support is not set up yet. Run supabase/complete-setup.sql in your Supabase SQL Editor." }, { status: 503 });
        }
        if (stockError) console.error("Unable to reserve product stock for an order.", stockError);
        return NextResponse.json({ error: "Inventory changed while placing your order. Refresh your cart and try again." }, { status: 409 });
      }
      stockChanges.push({ id: productId, quantity });
    }
    const { data: order, error: orderError } = await admin.from("orders").insert({
      user_id: user.id,
      customer_name: parsed.data.fullName,
      customer_email: profile.email,
      shipping_address: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        address: parsed.data.address,
        city: parsed.data.city,
        postalCode: parsed.data.postalCode,
      },
      subtotal: subtotal.toFixed(2),
      shipping_fee: shippingFee.toFixed(2),
      total: (subtotal + shippingFee).toFixed(2),
      payment_status: "pending",
      payment_method: parsed.data.paymentMethod,
      status: "pending",
    }).select("id, order_number, total, status").single();
    if (orderError || !order) {
      if (!(await restoreStock(admin, stockChanges))) {
        return NextResponse.json({ error: "Your order could not be saved, and stock could not be fully restored. Contact the store administrator." }, { status: 500 });
      }
      if (orderError && isMissingOrderSchema(orderError)) {
        const column = getMissingOrderColumn(orderError);
        console.error("Order schema is missing a checkout field.", { code: orderError.code, message: orderError.message });
        return NextResponse.json({
          error: `The Supabase orders table is missing${column ? ` the "${column}" column` : " a checkout column"}. Run supabase/migrations/20261026000000_order_checkout_fields.sql in the Supabase SQL Editor, then retry.`,
        }, { status: 503 });
      }
      if (orderError) console.error("Unable to save a customer order.", orderError);
      return NextResponse.json({ error: "Your order could not be saved. Please try again." }, { status: 500 });
    }

    const { error: itemsError } = await admin.from("order_items").insert(validItems.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) {
      const { error: deleteError } = await admin.from("orders").delete().eq("id", order.id);
      const stockRestored = await restoreStock(admin, stockChanges);
      if (deleteError || !stockRestored) {
        console.error("Unable to roll back an incomplete order.", { deleteError, itemsError });
        return NextResponse.json({ error: "Your order could not be completed. Contact the store administrator before trying again." }, { status: 500 });
      }
      console.error("Unable to save order items.", itemsError);
      return NextResponse.json({ error: "Your order items could not be saved. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Order placement failed unexpectedly.", error);
    return NextResponse.json({ error: "Order service is not configured. Check the Supabase server settings." }, { status: 503 });
  }
}
