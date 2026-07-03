export interface Product {
  id: number;
  name: string;
  price: number;
  discount: number;
  discountPrice: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  badge?: string;
  rank?: number; // For best sellers
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  slug: string;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  text: string;
  verified: boolean;
}
