import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-[#f7edea] py-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr] lg:px-10">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-black/70">Elijah ClothingShop</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-black/70">
            Minimal staples designed for everyday presence, comfort, and confident movement.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-black/80">Explore</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-black/70">
            <Link href="/shop">Shop</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-black/80">Contact</p>
          <div className="mt-4 space-y-3 text-sm text-black/70">
            <p>hello@elijahshop.com</p>
            <p>+63 917 123 4567</p>
            <p>Manila, Philippines</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
