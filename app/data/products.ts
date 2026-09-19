export type ProductCategory =
  | "T-Shirts"
  | "Shirts"
  | "Dresses"
  | "Pants"
  | "Jeans"
  | "Jackets"
  | "Skirts"
  | "Accessories";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  image: string;
  description: string;
  colors: string[];
  sizes: string[];
  badge?: string;
};

export const products: Product[] = [
  {
    id: "essential-white-tee",
    name: "Essential White T-Shirt",
    category: "T-Shirts",
    price: 899,
    image:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    description:
      "An elevated everyday tee cut for movement, softness, and effortless layering.",
    colors: ["White", "Stone", "Ivory"],
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "New Arrival",
  },
  {
    id: "classic-black-shirt",
    name: "Classic Black Shirt",
    category: "Shirts",
    price: 1299,
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    description:
      "A sharp, understated silhouette with a crisp finish for daily polish.",
    colors: ["Black", "Slate", "Charcoal"],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "minimal-beige-dress",
    name: "Minimal Beige Dress",
    category: "Dresses",
    price: 1799,
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    description:
      "A fluid silhouette that moves easily from daytime errands to evening plans.",
    colors: ["Beige", "Sand", "Taupe"],
    sizes: ["XS", "S", "M", "L"],
    badge: "Best Seller",
  },
  {
    id: "vintage-denim-jacket",
    name: "Vintage Denim Jacket",
    category: "Jackets",
    price: 2399,
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    description:
      "Relaxed structure, washed texture, and a timeless layer for all seasons.",
    colors: ["Indigo", "Washed Blue", "Black"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "straight-leg-jeans",
    name: "Straight Leg Jeans",
    category: "Jeans",
    price: 1899,
    image:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
    description:
      "Balanced, everyday denim with a clean leg line and all-day comfort.",
    colors: ["Blue", "Stone", "Ink"],
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "oversized-graphic-tee",
    name: "Oversized Graphic Tee",
    category: "T-Shirts",
    price: 1099,
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    description:
      "A laid-back statement tee designed with volume, ease, and a made-to-move fit.",
    colors: ["Cream", "Black", "Olive"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "tailored-neutral-coat",
    name: "Tailored Neutral Coat",
    category: "Jackets",
    price: 3499,
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    description:
      "A softly structured outer layer that anchors your wardrobe with ease.",
    colors: ["Camel", "Mocha", "Stone"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "linen-utility-skirt",
    name: "Linen Utility Skirt",
    category: "Skirts",
    price: 1499,
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    description:
      "A crisp, breathable silhouette with understated utility and an easy drape.",
    colors: ["Khaki", "Sand", "Black"],
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "everyday-brown-bag",
    name: "Everyday Brown Bag",
    category: "Accessories",
    price: 2199,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    description:
      "A soft, structured companion built for workdays, errands, and weekend escapes.",
    colors: ["Brown", "Tan", "Olive"],
    sizes: ["One Size"],
  },
  {
    id: "classic-cotton-shirt",
    name: "Classic Cotton Shirt",
    category: "Shirts",
    price: 1399,
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    description:
      "A refined layering staple in breathable cotton with an easy, polished fit.",
    colors: ["White", "Cream", "Blue"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "soft-knit-cardigan",
    name: "Soft Knit Cardigan",
    category: "Jackets",
    price: 2099,
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    description:
      "A cozy knit layer designed for ease, texture, and versatile styling.",
    colors: ["Cream", "Heather", "Mushroom"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "pocket-utility-pants",
    name: "Pocket Utility Pants",
    category: "Pants",
    price: 1699,
    image:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    description:
      "A relaxed, practical trouser cut for movement and sleek everyday styling.",
    colors: ["Khaki", "Black", "Stone"],
    sizes: ["S", "M", "L", "XL"],
  },
];

export const allCategories = [
  "All",
  "T-Shirts",
  "Shirts",
  "Dresses",
  "Pants",
  "Jeans",
  "Jackets",
  "Skirts",
  "Accessories",
] as const;

export const formatPrice = (value: number) => `₱${value.toLocaleString("en-US")}`;
