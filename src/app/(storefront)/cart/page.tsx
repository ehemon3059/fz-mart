"use client";

import Link from "next/link";
import { useCartStore, cartSubtotal, cartLineKey } from "@/lib/cart-store";
import { formatTaka } from "@/lib/money";
import { ArrowRight, TrashIcon } from "@/components/storefront/icons";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = cartSubtotal(items);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="co-wrap">
        <div className="co-empty">
          <p style={{ marginBottom: 14 }}>Your cart is empty.</p>
          <Link href="/" className="cart-continue">
            <ArrowRight size={15} style={{ transform: "rotate(180deg)" }} /> Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="co-wrap">
      <h1 className="co-title">Your Cart</h1>

      <div className="co-grid">
        {/* items */}
        <div className="co-col">
          <div className="co-card">
            <h2 className="co-hd">Cart items ({count})</h2>
            {items.map((item) => {
              const key = cartLineKey(item);
              return (
              <div key={key} className="co-line">
                <Link href={`/products/${item.slug}`} className="co-thumb">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
                </Link>
                <div className="co-line-main">
                  <div className="co-line-name">
                    <Link href={`/products/${item.slug}`}>{item.name}</Link>
                  </div>
                  <div className="co-line-sub">{formatTaka(item.unitPrice)} each</div>
                  <div className="co-line-qp">
                    <span className="qty">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(key, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQuantity(key, item.quantity + 1)}
                      >
                        +
                      </button>
                    </span>
                    <span className="co-line-price">
                      {formatTaka(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="co-del"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(key)}
                >
                  <TrashIcon size={17} />
                </button>
              </div>
              );
            })}
          </div>

          <Link href="/" className="cart-continue">
            <ArrowRight size={15} style={{ transform: "rotate(180deg)" }} /> Continue shopping
          </Link>
        </div>

        {/* summary */}
        <div className="co-col co-side">
          <div className="co-card">
            <h2 className="co-hd">Order summary</h2>
            <div className="co-sum">
              <div className="r">
                <span>Subtotal ({count} {count === 1 ? "item" : "items"})</span>
                <span>{formatTaka(subtotal)}</span>
              </div>
              <div className="r">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="r total">
                <span>Total</span>
                <span>{formatTaka(subtotal)}</span>
              </div>
            </div>

            <Link href="/checkout" className="checkout-btn">
              Proceed to Checkout
              <span className="cb-arrow"><ArrowRight size={18} /></span>
            </Link>

            <p className="cart-note">Cash on Delivery available · Free shipping over ৳499</p>
          </div>
        </div>
      </div>
    </div>
  );
}
