import { HeroSection } from "@/components/home/HeroSection";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { ProductRow } from "@/components/home/ProductRow";
import { SocialProof } from "@/components/home/SocialProof";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { Footer } from "@/components/home/Footer";
import { getAllCategories } from "@/lib/categories/data";
import {
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getFlashSaleProducts,
  getReviews,
} from "@/lib/products/data";

export default async function HomePage() {
  const categories = await getAllCategories();
  const flashSaleProducts = await getFlashSaleProducts();
  const newArrivals = await getNewArrivals();
  const bestSellers = await getBestSellers();
  const reviews = await getReviews();

  return (
    <div style={{ backgroundColor: "#fafaf9" }}>
      {/* Header Placeholder */}
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #ecebe8",
          padding: "12px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#c026d3" }}>
          FZ Mart
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
          <a href="#" style={{ color: "#c026d3" }}>Account</a>
          <a href="#" style={{ color: "#c026d3" }}>Cart (0)</a>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {/* Hero Section */}
        <HeroSection />

        {/* Trust Strip */}
        <TrustStrip />

        {/* Shop by Category */}
        <CategoryGrid categories={categories} />

        {/* Flash Sale */}
        <FlashSaleSection products={flashSaleProducts} />

        {/* Product Rows */}
        <ProductRow title="New Arrivals" products={newArrivals} ctaLink="#new-arrivals" />
        <ProductRow title="Best Sellers" products={bestSellers} showRank ctaLink="#best-sellers" />
        <ProductRow title="Featured" products={getFeaturedProducts()} ctaLink="#featured" />

        {/* Social Proof */}
        <SocialProof reviews={reviews} totalOrders={12000} rating={4.8} />

        {/* Newsletter */}
        <NewsletterSignup />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
