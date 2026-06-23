import { CashIcon, TruckIcon, ReturnIcon, ShieldCheck } from "./icons";

const ITEMS = [
  { Icon: CashIcon, title: "Cash on Delivery", sub: "Pay when it arrives" },
  { Icon: TruckIcon, title: "Fast Delivery", sub: "Dhaka within 24 hours" },
  { Icon: ReturnIcon, title: "7-Day Returns", sub: "Easy & hassle-free" },
  { Icon: ShieldCheck, title: "100% Authentic", sub: "Genuine products only" },
];

export default function TrustStrip() {
  return (
    <section className="trust">
      <div className="trust-grid">
        {ITEMS.map(({ Icon, title, sub }) => (
          <div className="trust-item" key={title}>
            <span className="trust-ic"><Icon size={22} /></span>
            <div>
              <b>{title}</b>
              <span>{sub}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
