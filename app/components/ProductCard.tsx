"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice, Product } from "@/app/data/products";
import { addCartItem, getWishlistItems, toggleWishlist } from "@/app/data/store";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setIsWishlisted(getWishlistItems().includes(product.id));
  }, [product.id]);

  const handleWishlistToggle = () => {
    const next = toggleWishlist(product.id);
    setIsWishlisted(next.includes(product.id));
  };

  const handleAddToCart = () => {
    addCartItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: product.sizes[0] ?? "M",
      color: product.colors[0] ?? "Default",
      quantity: 1,
    });
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <article className="group flex flex-col border border-black/10 bg-white transition-transform duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden bg-[#f2ece8]">
        <Link href={`/product/${product.id}`} className="block">
          <div className="relative h-[420px] overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        {product.badge && (
          <span className="absolute left-3 top-3 border border-black/10 bg-white/90 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-black/70">
            {product.badge}
          </span>
        )}

        <button
          type="button"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleWishlistToggle}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-black/10 bg-white/90 text-base text-black transition-colors hover:bg-black hover:text-white"
        >
          {isWishlisted ? "♥" : "♡"}
        </button>
      </div>

      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-5">
        <div>
          <h3 className="text-lg font-medium tracking-[-0.04em] text-black">{product.name}</h3>
          <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-black/55">{product.category}</p>
        </div>
        <p className="text-base font-medium text-black">{formatPrice(product.price)}</p>
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex w-full items-center justify-center border border-black/15 bg-black px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#3b2d28]"
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}
