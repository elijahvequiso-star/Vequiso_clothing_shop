import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f7edea] px-4 py-16 text-black">
      <div className="max-w-xl border border-black/10 bg-white p-8 text-center sm:p-10">
        <p className="text-[10px] uppercase tracking-[0.32em] text-black/60">404</p>
        <h1 className="mt-5 text-5xl leading-none tracking-[-0.07em] sm:text-6xl">
          This page doesn’t exist.
        </h1>
        <p className="mt-5 text-base leading-8 text-black/70">
          The page you’re looking for may have been moved, removed, or never existed.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex border border-black/10 bg-black px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-white hover:bg-[#3b2d28]"
          >
            Return Home
          </Link>
          <Link
            href="/shop"
            className="inline-flex border border-black/10 bg-white px-6 py-3 text-[10px] uppercase tracking-[0.26em] text-black hover:bg-[#f2e9e7]"
          >
            Shop Elijah
          </Link>
        </div>
      </div>
    </main>
  );
}
