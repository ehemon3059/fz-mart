import type { Product, Review } from "@/types/product";

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Premium Basmati Rice (5kg)",
    price: 850,
    discount: 15,
    discountPrice: 722,
    image: "https://via.placeholder.com/240x240?text=Basmati+Rice",
    rating: 4.8,
    reviews: 324,
    category: "Groceries",
    badge: "Flash Sale",
  },
  {
    id: 2,
    name: "Organic Vegetables Mix",
    price: 450,
    discount: 20,
    discountPrice: 360,
    image: "https://via.placeholder.com/240x240?text=Vegetables",
    rating: 4.6,
    reviews: 215,
    category: "Fresh",
    badge: "New",
  },
  {
    id: 3,
    name: "Wireless Earbuds Pro",
    price: 2499,
    discount: 25,
    discountPrice: 1874,
    image: "https://via.placeholder.com/240x240?text=Earbuds",
    rating: 4.7,
    reviews: 512,
    category: "Electronics",
    rank: 1,
  },
  {
    id: 4,
    name: "Smart Watch Ultra",
    price: 4999,
    discount: 30,
    discountPrice: 3499,
    image: "https://via.placeholder.com/240x240?text=Smart+Watch",
    rating: 4.5,
    reviews: 428,
    category: "Electronics",
    rank: 2,
  },
  {
    id: 5,
    name: "Cotton T-Shirt (Pack of 3)",
    price: 999,
    discount: 35,
    discountPrice: 649,
    image: "https://via.placeholder.com/240x240?text=T-Shirt",
    rating: 4.4,
    reviews: 189,
    category: "Fashion",
    rank: 3,
  },
  {
    id: 6,
    name: "LED Desk Lamp",
    price: 1299,
    discount: 22,
    discountPrice: 1013,
    image: "https://via.placeholder.com/240x240?text=Desk+Lamp",
    rating: 4.6,
    reviews: 276,
    category: "Home",
  },
  {
    id: 7,
    name: "Coffee Beans (500g)",
    price: 599,
    discount: 10,
    discountPrice: 539,
    image: "https://via.placeholder.com/240x240?text=Coffee",
    rating: 4.9,
    reviews: 387,
    category: "Groceries",
  },
  {
    id: 8,
    name: "Kitchen Knife Set",
    price: 1899,
    discount: 28,
    discountPrice: 1368,
    image: "https://via.placeholder.com/240x240?text=Knife+Set",
    rating: 4.7,
    reviews: 298,
    category: "Home",
  },
];

const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    author: "Fatima Khan",
    rating: 5,
    text: "Excellent quality and super fast delivery. Highly recommend!",
    verified: true,
  },
  {
    id: 2,
    author: "Karim Ahmed",
    rating: 5,
    text: "Cash on delivery made it so convenient. Products as described.",
    verified: true,
  },
  {
    id: 3,
    author: "Nadia Akter",
    rating: 4,
    text: "Great prices and good variety. Will order again soon.",
    verified: true,
  },
];

export async function getFeaturedProducts(): Promise<Product[]> {
  return MOCK_PRODUCTS.slice(0, 6);
}

export async function getNewArrivals(): Promise<Product[]> {
  return MOCK_PRODUCTS.slice(0, 8);
}

export async function getBestSellers(): Promise<Product[]> {
  return MOCK_PRODUCTS.slice(0, 8).map((p, i) => ({
    ...p,
    rank: i < 3 ? i + 1 : undefined,
  }));
}

export async function getFlashSaleProducts(): Promise<Product[]> {
  return MOCK_PRODUCTS.filter((p) => p.discount >= 20).slice(0, 8);
}

export async function getReviews(): Promise<Review[]> {
  return MOCK_REVIEWS;
}

export function calculateDiscountPercentage(original: number, discounted: number): number {
  return Math.round(((original - discounted) / original) * 100);
}
