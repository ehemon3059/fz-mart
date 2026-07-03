export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#23211e",
        color: "#ffffff",
        padding: "40px 20px",
        marginTop: "60px",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "32px",
        }}
        className="sm:grid-cols-3 lg:grid-cols-4"
      >
        {/* About */}
        <div>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            About FZ Mart
          </h4>
          <ul style={{ listStyle: "none", fontSize: "13px", lineHeight: "2" }}>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>About Us</a></li>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Careers</a></li>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Blog</a></li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            Help & Support
          </h4>
          <ul style={{ listStyle: "none", fontSize: "13px", lineHeight: "2" }}>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Contact Us</a></li>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>FAQs</a></li>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Track Order</a></li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            Policies
          </h4>
          <ul style={{ listStyle: "none", fontSize: "13px", lineHeight: "2" }}>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Returns</a></li>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Terms</a></li>
            <li><a href="#" style={{ color: "#a8a8a6", textDecoration: "none" }}>Privacy</a></li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            Connect
          </h4>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <a href="#" style={{ color: "#c026d3", textDecoration: "none", fontSize: "12px", fontWeight: "600" }}>Facebook</a>
            <a href="#" style={{ color: "#c026d3", textDecoration: "none", fontSize: "12px", fontWeight: "600" }}>Instagram</a>
            <a href="#" style={{ color: "#c026d3", textDecoration: "none", fontSize: "12px", fontWeight: "600" }}>WhatsApp</a>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div
        style={{
          borderTop: "1px solid #3f3f3d",
          paddingTop: "24px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            color: "#a8a8a6",
            marginBottom: "12px",
            fontWeight: "600",
          }}
        >
          PAYMENT METHODS
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "#3f3f3d",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#a8a8a6",
            }}
          >
            💳 Credit/Debit Card
          </div>
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "#3f3f3d",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#a8a8a6",
            }}
          >
            📱 bKash/Nagad
          </div>
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "#3f3f3d",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#a8a8a6",
            }}
          >
            🚚 Cash on Delivery
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div
        style={{
          borderTop: "1px solid #3f3f3d",
          paddingTop: "24px",
          textAlign: "center",
          fontSize: "12px",
          color: "#a8a8a6",
        }}
      >
        <p>© 2024 FZ Mart Bangladesh. All rights reserved.</p>
        <p style={{ marginTop: "8px" }}>🇧🇩 Delivering happiness across Bangladesh</p>
      </div>
    </footer>
  );
}
