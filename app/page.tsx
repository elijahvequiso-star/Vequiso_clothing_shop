import Image from "next/image";
import Link from "next/link";
import ProductGrid from "@/app/components/ProductGrid";
import { formatPrice, products } from "@/app/data/products";

const featuredProducts = products.slice(0, 4);

export default function Home() {
  return (
    <main className="bg-[#f7edea] text-black">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:px-10 lg:pb-16 lg:pt-12">
        <div className="order-2 flex flex-col justify-center lg:order-1">
          <p className="text-[10px] uppercase tracking-[0.34em] text-black/60">EDITORIAL DROP</p>
          <h1 className="mt-4 text-5xl leading-[0.88] tracking-[-0.08em] sm:text-6xl lg:text-[7rem] lg:leading-[0.8]">
            DEFINE
            <br />
            YOUR
            <br />
            STYLE
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-black/70">
            Modern essentials designed for confidence, comfort, and everyday style.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3b2d28]"
            >
              SHOP THE COLLECTION
            </Link>
            <Link href="/about" className="text-[10px] uppercase tracking-[0.28em] text-black/70 hover:text-black">
              Discover More
            </Link>
          </div>
        </div>

        <div className="order-1 relative h-[520px] overflow-hidden border border-black/10 bg-[#ebddd8] lg:order-2 lg:h-[700px]">
          <Image
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
            alt="Fashion portrait of a woman wearing modern clothing"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Curated essentials</p>
            <h2 className="mt-3 text-4xl leading-none tracking-[-0.06em] sm:text-5xl">SHOP ELIJAH</h2>
          </div>
          <Link href="/shop" className="hidden text-[10px] uppercase tracking-[0.28em] text-black/70 hover:text-black sm:inline-flex">
            View All
          </Link>
        </div>

        <ProductGrid products={featuredProducts} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6 border border-black/10 bg-white p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Selected edit</p>
            <h3 className="text-4xl leading-none tracking-[-0.06em]">The everyday uniform.</h3>
            <p className="text-base leading-8 text-black/70">
              Thoughtful layers, easy tailoring, and elevated basics shaped for motion, presence, and the rhythm of real life.
            </p>
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              {featuredProducts.slice(0, 2).map((product) => (
                <div key={product.id} className="border border-black/10 p-3">
                  <div className="relative h-44 overflow-hidden bg-[#f3ece9]">
                    <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 18vw" className="object-cover" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base tracking-[-0.04em] text-black">{product.name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-black/55">{product.category}</p>
                    </div>
                    <p className="text-sm font-medium text-black">{formatPrice(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[520px] overflow-hidden border border-black/10 bg-[#d8c3b8]">
            <Image
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80"
              alt="Model wearing minimal fashion"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
