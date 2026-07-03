import { StarIcon } from "@/components/icons";
import type { Review } from "@/types/product";

interface SocialProofProps {
  reviews: Review[];
  totalOrders: number;
  rating: number;
}

export function SocialProof({ reviews, totalOrders, rating }: SocialProofProps) {
  return (
    <div style={{ marginBottom: "40px" }}>
      {/* Rating Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #ecebe8",
          borderRadius: "14px",
          padding: "20px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "4px",
            marginBottom: "8px",
          }}
        >
          {[...Array(5)].map((_, i) => (
            <StarIcon key={i} size={20} style={{ color: "#c026d3" }} />
          ))}
        </div>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "#23211e",
            marginBottom: "4px",
          }}
        >
          {rating} out of 5
        </h3>
        <p
          style={{
            fontSize: "14px",
            color: "#5c5852",
          }}
        >
          Based on {totalOrders.toLocaleString()}+ customer orders
        </p>
      </div>

      {/* Review Quotes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(1, 1fr)",
          gap: "12px",
        }}
        className="sm:grid-cols-2 lg:grid-cols-3"
      >
        {reviews.map((review) => (
          <div
            key={review.id}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #ecebe8",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
              {[...Array(review.rating)].map((_, i) => (
                <StarIcon key={i} size={14} style={{ color: "#c026d3" }} />
              ))}
            </div>
            <p
              style={{
                fontSize: "14px",
                color: "#23211e",
                marginBottom: "12px",
                fontWeight: "500",
              }}
            >
              "{review.text}"
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#c026d3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                {review.author.charAt(0)}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#23211e",
                  }}
                >
                  {review.author}
                </div>
                {review.verified && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#10b981",
                      fontWeight: "600",
                    }}
                  >
                    ✓ Verified
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
