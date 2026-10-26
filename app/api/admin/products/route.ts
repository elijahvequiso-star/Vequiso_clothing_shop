import { NextResponse } from "next/server";
import { z } from "zod";
import { products as storefrontProducts } from "@/app/data/products";
import { requireAdmin } from "@/app/lib/auth";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

const updateSchema = z.object({
  id: z.string().min(1).max(100),
  regular_price: z.number().finite().min(0).max(10_000_000),
  discount_percent: z.number().finite().min(0).max(100),
});
const salePrice = (regularPrice: number, discountPercent: number) => Math.round(regularPrice * (1 - discountPercent / 100) * 100) / 100;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const db = createSupabaseAdminClient();
  const [{ data: managed, error: productError }, { data: settings, error: settingsError }] = await Promise.all([
    db.from("products").select("id,name,category,price,image,description,colors,sizes,active,created_at").order("created_at", { ascending: false }),
    db.from("product_price_settings").select("product_id,regular_price,discount_percent"),
  ]);
  if (productError || settingsError) return NextResponse.json({ error: "Unable to load the catalog. Apply the product discounts migration in Supabase." }, { status: 500 });
  const productMap = new Map((managed ?? []).map((product) => [product.id, product]));
  const settingMap = new Map((settings ?? []).map((setting) => [setting.product_id, setting]));
  const merged = storefrontProducts.map((fallback) => {
    const product = productMap.get(fallback.id);
    const setting = settingMap.get(fallback.id);
    const regularPrice = Number(setting?.regular_price ?? product?.price ?? fallback.price);
    return { ...(product ?? fallback), id: fallback.id, name: product?.name ?? fallback.name, category: product?.category ?? fallback.category, regularPrice, discountPercent: Number(setting?.discount_percent ?? 0), price: salePrice(regularPrice, Number(setting?.discount_percent ?? 0)) };
  });
  for (const product of managed ?? []) {
    if (storefrontProducts.some((fallback) => fallback.id === product.id)) continue;
    const setting = settingMap.get(product.id); const regularPrice = Number(setting?.regular_price ?? product.price);
    merged.push({ ...product, regularPrice, discountPercent: Number(setting?.discount_percent ?? 0), price: salePrice(regularPrice, Number(setting?.discount_percent ?? 0)) });
  }
  return NextResponse.json({ products: merged });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid regular price and a discount from 0% to 100%." }, { status: 400 });
  const { id, regular_price, discount_percent } = parsed.data;
  const db = createSupabaseAdminClient();
  const existsInStorefront = storefrontProducts.some((product) => product.id === id);
  const { data: databaseProduct, error: productError } = await db.from("products").select("id").eq("id", id).maybeSingle();
  if (productError) return NextResponse.json({ error: "Unable to check this product in the store catalog." }, { status: 500 });
  if (!existsInStorefront && !databaseProduct) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const { error } = await db.from("product_price_settings").upsert({ product_id: id, regular_price, discount_percent, updated_by: admin.user.id, updated_at: new Date().toISOString() }, { onConflict: "product_id" });
  if (error) return NextResponse.json({ error: "Unable to save this price. Apply the product discounts migration." }, { status: 400 });
  const productName = storefrontProducts.find((product) => product.id === id)?.name ?? id;
  const finalPrice = salePrice(regular_price, discount_percent);
  await db.from("activity_log").insert({ actor_id: admin.user.id, event_type: "product.price_updated", message: `${productName} price updated to ${finalPrice}`, metadata: { product_id: id, regular_price, discount_percent, sale_price: finalPrice } });
  return NextResponse.json({ price: finalPrice, regular_price, discount_percent });
}
