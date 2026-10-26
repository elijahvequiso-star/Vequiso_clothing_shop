import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import SiteChrome from "@/app/components/SiteChrome";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ELIJAH CLOTHINGSHOP",
  description: "Minimal modern fashion storefront for Elijah ClothingShop.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f7edea] text-black">
        <div className="min-h-screen">
          <SiteChrome />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
