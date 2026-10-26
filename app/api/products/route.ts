import { NextResponse } from "next/server";
import { products as fallbackProducts, Product } from "@/app/data/products";
import { isMissingProductPriceSettingsTable } from "@/app/lib/product-pricing";
import { createSupabaseAdminClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([supabase.from("products")
      .select("id, name, category, price, image, description, colors, sizes, active")
      .order("created_at", { ascending: false }), supabase.from("product_price_settings").select("product_id,regular_price,discount_percent")]);
    if (error || (settingsError && !isMissingProductPriceSettingsTable(settingsError))) {
      return NextResponse.json({ error: "Product catalog is unavailable." }, { status: 503 });
    }

    const databaseProducts = data ?? [];
    const byId = new Map(databaseProducts.map((product) => [product.id, product]));
    const priceSettings = new Map((settings ?? []).map((setting) => [setting.product_id, setting]));
    const applyPrice = (product: Product) => {
      const setting = priceSettings.get(product.id);
      if (!setting) return product;
      const regularPrice = Number(setting.regular_price);
      const discountPercent = Number(setting.discount_percent);
      return { ...product, regularPrice, discountPercent, price: Math.round(regularPrice * (1 - discountPercent / 100) * 100) / 100 };
    };
    const merged = fallbackProducts.flatMap((fallback) => {
      const managed = byId.get(fallback.id);
      if (!managed) return [applyPrice(fallback)];
      if (!managed.active) return [];
      const current = { ...fallback, ...managed, category: managed.category as Product["category"], price: Number(managed.price), badge: fallback.badge };
      return [applyPrice(current)];
    });
    for (const managed of databaseProducts) {
      if (!managed.active || fallbackProducts.some((product) => product.id === managed.id)) continue;
      merged.push(applyPrice({ ...managed, category: managed.category as Product["category"], price: Number(managed.price) }));
    }
    return NextResponse.json({ products: merged });
  } catch {
    return NextResponse.json({ error: "Product catalog is not configured." }, { status: 503 });
  }
}
