"use client";

import Image from "next/image";
import { formatPrice } from "@/app/data/products";
import { CartItem as CartItemType, removeCartItem, updateCartItemQuantity } from "@/app/data/store";

type CartItemProps = {
  item: CartItemType;
};

export default function CartItem({ item }: CartItemProps) {
  const handleIncrement = () => {
    updateCartItemQuantity(item.productId, item.size, item.color, 1);
    window.dispatchEvent(new Event("storage"));
  };

  const handleDecrement = () => {
    updateCartItemQuantity(item.productId, item.size, item.color, -1);
    window.dispatchEvent(new Event("storage"));
  };

  const handleRemove = () => {
    removeCartItem(item.productId, item.size, item.color);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="grid gap-5 border-b border-black/10 pb-6 pt-5 sm:grid-cols-[130px_1fr]">
      <div className="relative h-[160px] overflow-hidden bg-[#f2ece8]">
        <Image src={item.image} alt={item.name} fill sizes="130px" className="object-cover" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl tracking-[-0.04em] text-black">{item.name}</h3>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-black/60">
            {item.color} / {item.size}
          </p>
          <p className="mt-3 text-lg font-medium text-black">{formatPrice(item.price)}</p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="flex items-center border border-black/10">
            <button type="button" onClick={handleDecrement} className="h-10 w-10 text-xl text-black/70">
              −
            </button>
            <span className="min-w-12 text-center text-sm text-black">{item.quantity}</span>
            <button type="button" onClick={handleIncrement} className="h-10 w-10 text-xl text-black/70">
              +
            </button>
          </div>

          <button type="button" onClick={handleRemove} className="text-[10px] uppercase tracking-[0.22em] text-black/65 underline-offset-4 hover:underline">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
