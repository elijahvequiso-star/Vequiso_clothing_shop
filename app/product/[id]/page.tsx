"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, products } from "@/app/data/products";
import { addCartItem, getWishlistItems, toggleWishlist } from "@/app/data/store";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const product = products.find((item) => item.id === params.id);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedColor(product.colors[0] ?? "");
    setSelectedSize(product.sizes[0] ?? "M");
    setIsWishlisted(getWishlistItems().includes(product.id));
  }, [product]);

  if (!product) {
    return (
      <main className="bg-[#f7edea] px-4 py-24 text-center text-black">
        <p className="text-lg">This product could not be found.</p>
        <Link href="/shop" className="mt-6 inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white">
          Back to Shop
        </Link>
      </main>
    );
  }

  const related = useMemo(
    () => products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3),
    [product],
  );

  const handleAddToCart = () => {
    addCartItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: selectedSize,
      color: selectedColor,
      quantity,
    });
    window.dispatchEvent(new Event("storage"));
    router.push("/cart");
  };

  const handleWishlistToggle = () => {
    const next = toggleWishlist(product.id);
    setIsWishlisted(next.includes(product.id));
  };

  return (
    <main className="bg-[#f7edea] py-12 text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden border border-black/10 bg-[#f2ece8]">
            <div className="relative h-[680px]">
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/60">{product.category}</p>
            <h1 className="mt-4 text-4xl leading-none tracking-[-0.06em] sm:text-5xl">{product.name}</h1>
            <p className="mt-6 text-2xl font-medium text-black">{formatPrice(product.price)}</p>
            <p className="mt-6 max-w-xl text-base leading-8 text-black/75">{product.description}</p>

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Sizes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`border px-3 py-2 text-xs ${selectedSize === size ? "border-black bg-black text-white" : "border-black/15 bg-white text-black/80"}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Colors</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`border px-3 py-2 text-xs uppercase tracking-[0.16em] ${selectedColor === color ? "border-black bg-black text-white" : "border-black/15 bg-white text-black/80"}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border border-black/10 bg-white">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-12 w-12 text-xl text-black/70">−</button>
                <span className="min-w-12 text-center text-sm text-black">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} className="h-12 w-12 text-xl text-black/70">+</button>
              </div>
              <button type="button" onClick={handleAddToCart} className="flex-1 border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white hover:bg-[#3b2d28]">
                ADD TO CART
              </button>
            </div>

            <div className="mt-4 flex gap-4">
              <button type="button" onClick={handleWishlistToggle} className="flex-1 border border-black/10 bg-white px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-black hover:bg-[#f0e5e2]">
                {isWishlisted ? "WISHLISTED" : "WISHLIST"}
              </button>
              <button type="button" onClick={handleAddToCart} className="flex-1 border border-black/10 bg-[#efe4df] px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-black hover:bg-[#e2d0ca]">
                BUY NOW
              </button>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">You may also like</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} href={`/product/${item.id}`} className="group border border-black/10 bg-white transition-transform hover:-translate-y-1">
                <div className="relative h-[320px] overflow-hidden bg-[#f2ece8]">
                  <Image src={item.image} alt={item.name} fill sizes="33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <h3 className="text-lg tracking-[-0.04em] text-black">{item.name}</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-black/55">{item.category}</p>
                  </div>
                  <p className="text-base font-medium text-black">{formatPrice(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
