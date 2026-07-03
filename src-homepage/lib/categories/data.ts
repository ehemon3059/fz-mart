import type { Category } from "@/types/product";

const MOCK_CATEGORIES: Category[] = [
  {
    id: 1,
    name: "Groceries",
    icon: "🛒",
    slug: "groceries",
  },
  {
    id: 2,
    name: "Fresh Produce",
    icon: "🥬",
    slug: "fresh-produce",
  },
  {
    id: 3,
    name: "Electronics",
    icon: "📱",
    slug: "electronics",
  },
  {
    id: 4,
    name: "Fashion",
    icon: "👔",
    slug: "fashion",
  },
  {
    id: 5,
    name: "Home & Kitchen",
    icon: "🏠",
    slug: "home-kitchen",
  },
  {
    id: 6,
    name: "Beauty & Health",
    icon: "💄",
    slug: "beauty-health",
  },
  {
    id: 7,
    name: "Sports & Outdoors",
    icon: "⚽",
    slug: "sports",
  },
  {
    id: 8,
    name: "Books & Media",
    icon: "📚",
    slug: "books",
  },
];

export async function getAllCategories(): Promise<Category[]> {
  return MOCK_CATEGORIES;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return MOCK_CATEGORIES.find((c) => c.slug === slug) || null;
}
