import Link from "next/link";

const editorialBlocks = [
  {
    label: "ABOUT_01",
    title: "LESS, BUT BETTER",
    text: "We shape refined essentials that do more with less—pieces designed to last, layer, and keep their quiet confidence through every season.",
  },
  {
    label: "ABOUT_02",
    title: "PRESENCE OVER NOISE",
    text: "Fashion should feel personal, not loud. Each Elijah silhouette is curated to bring intention, ease, and character without excess.",
  },
  {
    label: "ABOUT_03",
    title: "WEAR IT IN",
    text: "Comfort is part of the design. Our wardrobe is built for everyday rituals—soft structure, relaxed proportion, and pieces that become yours over time.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-[#f7edea] text-black">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em] text-black/60">Our philosophy</p>
            <h1 className="mt-6 text-5xl leading-[0.88] tracking-[-0.07em] sm:text-6xl lg:text-8xl">
              Clothes for
              <br />
              the in-between.
            </h1>
          </div>
          <p className="max-w-md text-base leading-8 text-black/70">
            Crafted for the moments between work and weekend, quiet confidence and everyday rhythm—precisely the spaces where personal style takes shape.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {editorialBlocks.map((block) => (
            <article key={block.label} className="border border-black/10 bg-white p-6 sm:p-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/55">{block.label}</p>
              <h2 className="mt-6 text-3xl leading-none tracking-[-0.05em]">{block.title}</h2>
              <p className="mt-5 text-base leading-7 text-black/70">{block.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative h-[520px] overflow-hidden border border-black/10 bg-[#e7d7d1]">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
              alt="Editorial portrait"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-between border border-black/10 bg-white p-6 sm:p-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">Quiet luxury</p>
              <h3 className="mt-6 text-4xl leading-none tracking-[-0.06em]">Designed to move with you.</h3>
            </div>
            <p className="mt-8 text-base leading-8 text-black/70">
              Our collections combine visual ease and tactile comfort—clean shapes, sincere materials, and thoughtful proportions for a wardrobe that feels lived in from day one.
            </p>
            <Link href="/shop" className="mt-8 inline-flex border border-black/10 px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-black transition-colors hover:bg-black hover:text-white">
              Shop Elijah
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
