import { TruckIcon, CheckCircleIcon, HeartIcon, MapPinIcon } from "@/components/icons";

export function TrustStrip() {
  const trustItems = [
    {
      icon: TruckIcon,
      label: "Cash on Delivery",
      description: "Pay after receiving",
    },
    {
      icon: CheckCircleIcon,
      label: "Free Shipping",
      description: "Over ৳499",
    },
    {
      icon: HeartIcon,
      label: "Easy Returns",
      description: "7-day guarantee",
    },
    {
      icon: MapPinIcon,
      label: "Authentic Products",
      description: "100% genuine",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        marginBottom: "40px",
      }}
      className="sm:grid-cols-4"
    >
      {trustItems.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #ecebe8",
              borderRadius: "14px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <Icon size={32} style={{ color: "#c026d3", marginBottom: "12px", display: "block", margin: "0 auto 12px" }} />
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#23211e",
                marginBottom: "4px",
              }}
            >
              {item.label}
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#5c5852",
              }}
            >
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
