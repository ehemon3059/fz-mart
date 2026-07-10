"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PaymentMethod, ShippingZone } from "@prisma/client";
import { useCartStore, cartSubtotal, cartLineKey, type CartItem } from "@/lib/cart-store";
import { formatTaka } from "@/lib/money";
import { CashIcon, CheckIcon, TrashIcon } from "@/components/storefront/icons";
import type { CheckoutPaymentOptions } from "@/server/settings/payments";
import { placeOrder, applyCoupon, requestCheckoutOtp, confirmCheckoutOtp, syncCart } from "./actions";
import { recordCheckoutStart } from "../funnel-actions";
import { getFbAttribution } from "@/lib/fb-attribution";
import { readUtmAttribution, type UtmAttribution } from "@/lib/utm-attribution";

interface Props {
  zones: ShippingZone[];
  /** Which payment choices the admin has enabled — nothing secret in here. */
  paymentOptions: CheckoutPaymentOptions;
  /** When set, checkout is for this single product only — bypasses the cart. */
  buyNowProductId: number | null;
  /** The specific size chosen for a Buy Now of a sized product. */
  buyNowVariantId: number | null;
  /** Whether a customer is signed in — enables abandoned-cart persistence. */
  loggedIn: boolean;
}

const NOTE_MAX = 90;

export default function CheckoutForm({
  zones,
  paymentOptions,
  buyNowProductId,
  buyNowVariantId,
  loggedIn,
}: Props) {
  const cartItems = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clear);

  // Buy Now bypasses the cart entirely: checkout uses ONLY that single item
  // (matched by product AND chosen size), even if other items sit in the cart.
  const checkoutItems: CartItem[] = useMemo(() => {
    if (buyNowProductId == null) return cartItems;
    const single = cartItems.find(
      (i) => i.productId === buyNowProductId && (i.variantId ?? null) === buyNowVariantId,
    );
    return single ? [single] : [];
  }, [cartItems, buyNowProductId, buyNowVariantId]);

  const [zoneId, setZoneId] = useState<number | "">(zones[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [provider, setProvider] = useState(paymentOptions.providers[0]?.key ?? "");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Coupon: applied against the server-verified subtotal (applyCoupon), so the
  // discount shown here is exactly what checkout will charge.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, startCoupon] = useTransition();

  // Phone-OTP step for COD (only shown when the server asks for it).
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [savedForm, setSavedForm] = useState<FormData | null>(null);
  const [otpPending, startOtp] = useTransition();

  // Facebook click ids, read from cookies/URL once on mount and submitted as
  // hidden fields so a confirmed order can be attributed back to its ad.
  const [fbAttribution, setFbAttribution] = useState({ fbp: "", fbc: "" });
  // First-touch utm_* (Google/TikTok/etc.), read from the fz_utm cookie.
  const [utm, setUtm] = useState<UtmAttribution>({ utmSource: "", utmMedium: "", utmCampaign: "" });
  useEffect(() => {
    setFbAttribution(getFbAttribution());
    setUtm(readUtmAttribution());
  }, []);

  function currentPhone(): string {
    return savedForm ? String(savedForm.get("customerPhone") ?? "") : "";
  }

  function sendOtp() {
    setOtpMsg(null);
    startOtp(async () => {
      const res = await requestCheckoutOtp(currentPhone());
      if (res.error) setOtpMsg(res.error);
      else if (res.sent) setOtpMsg("We sent a code to your phone.");
    });
  }

  function verifyOtpAndPlace() {
    setOtpMsg(null);
    startOtp(async () => {
      const res = await confirmCheckoutOtp(currentPhone(), otpCode);
      if (res.error) {
        setOtpMsg(res.error);
        return;
      }
      if (res.verified && savedForm) {
        setOtpVerified(true);
        // Phone is now verified server-side; re-submit the saved order.
        await submitOrder(savedForm);
      }
    });
  }

  const subtotal = cartSubtotal(checkoutItems);
  const selectedZone = zones.find((z) => z.id === zoneId);
  const deliveryCharge = selectedZone?.charge ?? 0;
  const discount = coupon?.discount ?? 0;
  const total = subtotal + deliveryCharge - discount;

  function handleApplyCoupon() {
    setCouponError(null);
    const code = couponInput.trim();
    if (!code) return;
    startCoupon(async () => {
      const result = await applyCoupon(
        checkoutItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          quantity: i.quantity,
        })),
        code,
      );
      if (result.error) {
        setCoupon(null);
        setCouponError(result.error);
      } else if (result.code && result.discount != null) {
        setCoupon({ code: result.code, discount: result.discount });
      }
    });
  }

  async function submitOrder(formData: FormData) {
    const result = await placeOrder(
      checkoutItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        quantity: i.quantity,
      })),
      formData,
    );
    if (result?.otpRequired) {
      // COD anti-fraud: verify the phone, then this same form is re-submitted.
      setSavedForm(formData);
      setOtpStep(true);
      return;
    }
    if (result?.error) {
      setError(result.error);
      return;
    }
    // Only clear the whole cart on a normal checkout; Buy Now should leave
    // any other cart items untouched.
    if (buyNowProductId == null) clearCart();
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      await submitOrder(formData);
    });
  }

  // Auto-send the first OTP as soon as the verify step opens.
  useEffect(() => {
    if (otpStep && !otpVerified) sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpStep]);

  // Funnel: a checkout was started (all entries — guests, buy-now, and logged-in
  // — unlike syncCart which is scoped to recoverable identified carts). Once per
  // mount; fire-and-forget.
  useEffect(() => {
    if (checkoutItems.length === 0) return;
    void recordCheckoutStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist a logged-in customer's cart on checkout entry, so an abandoned
  // checkout can be recovered. Guests and the buy-now flow are skipped.
  useEffect(() => {
    if (!loggedIn || buyNowProductId != null || checkoutItems.length === 0) return;
    syncCart(
      checkoutItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        name: i.name,
        price: i.unitPrice,
        quantity: i.quantity,
        slug: i.slug,
        imageUrl: i.imageUrl,
      })),
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checkoutItems.length === 0) {
    return <p className="co-empty">Your cart is empty.</p>;
  }

  return (
    <>
      {otpStep && !otpVerified && (
        <div className="otp-overlay" role="dialog" aria-modal="true">
          <div className="otp-modal">
            <h2 className="co-hd">Verify your phone</h2>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 12 }}>
              For Cash on Delivery, enter the 6-digit code we sent by SMS to {currentPhone()}.
            </p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="6-digit code"
              className="co-input"
              style={{ textAlign: "center", letterSpacing: "0.3em", fontSize: 18 }}
            />
            {otpMsg && <p style={{ fontSize: 12.5, marginTop: 8, color: "var(--ink-mute)" }}>{otpMsg}</p>}
            <button
              type="button"
              onClick={verifyOtpAndPlace}
              disabled={otpPending || otpCode.length !== 6}
              className="co-place"
              style={{ marginTop: 12 }}
            >
              {otpPending ? "Verifying…" : "Verify & place order"}
            </button>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <button type="button" onClick={sendOtp} disabled={otpPending} style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--brand-dark)" }}>
                Resend code
              </button>
              <button type="button" onClick={() => { setOtpStep(false); setOtpCode(""); setOtpMsg(null); }} style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", color: "var(--ink-mute)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    <form action={handleSubmit} className="co-grid">
      {/* ---------- left column ---------- */}
      <div className="co-col">
        <div className="co-card">
          <h2 className="co-hd">Order review</h2>
          {checkoutItems.map((item) => {
            const key = cartLineKey(item);
            return (
            <div key={key} className="co-line">
              <div className="co-thumb">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
              </div>
              <div className="co-line-main">
                <div className="co-line-name">{item.name}</div>
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

        <div className="co-card">
          <h2 className="co-hd">Shipping address</h2>
          <div className="co-row2 co-field">
            <input
              name="customerName"
              required
              className="co-input"
              placeholder="Your full name *"
            />
            <div className="co-phone">
              <span className="cc">88</span>
              <input
                name="customerPhone"
                required
                inputMode="numeric"
                maxLength={11}
                placeholder="017XXXXXXXX"
              />
            </div>
          </div>
          <div className="co-field">
            <textarea
              name="address"
              required
              rows={2}
              className="co-area"
              placeholder="ex: House no. / building / street / area"
            />
          </div>
          <div className="co-row2 co-field">
            <select
              name="shippingZoneId"
              required
              value={zoneId}
              onChange={(e) => setZoneId(Number(e.target.value))}
              className="co-select"
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} — {formatTaka(zone.charge)}
                </option>
              ))}
            </select>
            <input
              name="customerEmail"
              type="email"
              className="co-input"
              placeholder="Email (optional)"
            />
          </div>
        </div>
      </div>

      {/* ---------- right column ---------- */}
      <div className="co-col co-side">
        <div className="co-card">
          <h2 className="co-hd">Payment method</h2>
          <input type="hidden" name="paymentMethod" value={paymentMethod} />
          <input type="hidden" name="paymentProvider" value={provider} />
          <input type="hidden" name="fbp" value={fbAttribution.fbp} />
          <input type="hidden" name="fbc" value={fbAttribution.fbc} />
          <input type="hidden" name="utmSource" value={utm.utmSource} />
          <input type="hidden" name="utmMedium" value={utm.utmMedium} />
          <input type="hidden" name="utmCampaign" value={utm.utmCampaign} />

          <button
            type="button"
            className={`pay-opt ${paymentMethod === "COD" ? "on" : ""}`}
            onClick={() => setPaymentMethod("COD")}
          >
            <span className="pay-ic"><CashIcon size={20} /></span>
            <b>Cash on Delivery</b>
            {paymentMethod === "COD" && <span className="pay-check"><CheckIcon size={18} /></span>}
          </button>

          {paymentOptions.onlineEnabled && (
            <button
              type="button"
              className={`pay-opt ${paymentMethod === "ONLINE" ? "on" : ""}`}
              onClick={() => setPaymentMethod("ONLINE")}
            >
              <span className="pay-ic"><CheckIcon size={20} /></span>
              <b>Pay full amount online</b>
              {paymentMethod === "ONLINE" && (
                <span className="pay-check"><CheckIcon size={18} /></span>
              )}
            </button>
          )}

          {paymentOptions.partialEnabled && (
            <button
              type="button"
              className={`pay-opt ${paymentMethod === "PARTIAL" ? "on" : ""}`}
              onClick={() => setPaymentMethod("PARTIAL")}
            >
              <span className="pay-ic"><CheckIcon size={20} /></span>
              <span>
                <b>Pay delivery charge now</b>
                <span className="block text-[12px] text-gray-500">
                  {formatTaka(deliveryCharge)} online, rest cash on delivery
                </span>
              </span>
              {paymentMethod === "PARTIAL" && (
                <span className="pay-check"><CheckIcon size={18} /></span>
              )}
            </button>
          )}

          {paymentMethod !== "COD" && paymentOptions.providers.length > 1 && (
            <div className="mt-2">
              <label className="mb-1 block text-[13px] font-medium">Pay with</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as typeof provider)}
                className="co-select w-full"
              >
                {paymentOptions.providers.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="co-card">
          <input type="hidden" name="couponCode" value={coupon?.code ?? ""} />
          <div className="co-sum">
            <div className="r">
              <span>Subtotal</span>
              <span>{formatTaka(subtotal)}</span>
            </div>
            <div className="r">
              <span>Delivery cost</span>
              <span>{formatTaka(deliveryCharge)}</span>
            </div>
            {coupon && (
              <div className="r" style={{ color: "var(--brand-dark)" }}>
                <span>
                  Coupon <b>{coupon.code}</b>{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setCoupon(null);
                      setCouponInput("");
                    }}
                    style={{ marginLeft: 4, textDecoration: "underline", background: "none", border: 0, cursor: "pointer", color: "inherit" }}
                  >
                    remove
                  </button>
                </span>
                <span>−{formatTaka(coupon.discount)}</span>
              </div>
            )}
            <div className="r total">
              <span>Total</span>
              <span>{formatTaka(total)}</span>
            </div>
            {paymentMethod === "ONLINE" && (
              <div className="r">
                <span>Pay online now</span>
                <span>{formatTaka(total)}</span>
              </div>
            )}
            {paymentMethod === "PARTIAL" && (
              <>
                <div className="r">
                  <span>Pay online now</span>
                  <span>{formatTaka(deliveryCharge)}</span>
                </div>
                <div className="r">
                  <span>Due on delivery</span>
                  <span>{formatTaka(total - deliveryCharge)}</span>
                </div>
              </>
            )}
          </div>
          {!coupon && (
            <div className="co-coupon" style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="co-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponPending || !couponInput.trim()}
                className="co-place"
                style={{ width: "auto", padding: "0 16px" }}
              >
                {couponPending ? "…" : "Apply"}
              </button>
            </div>
          )}
          {couponError && <p className="co-err" role="alert" style={{ marginTop: 8 }}>{couponError}</p>}
        </div>

        <div className="co-card">
          <h2 className="co-hd">Special notes <span style={{ fontWeight: 400, color: "var(--ink-mute)" }}>(optional)</span></h2>
          <textarea
            name="customerNote"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="co-area"
            placeholder="Anything we should know about delivery?"
          />
          <div className="co-count">{note.length} / {NOTE_MAX} characters</div>
        </div>

        <div>
          <label className="co-terms">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              I have read and agree to the{" "}
              <a href="/terms" target="_blank">Terms and Conditions</a>,{" "}
              <a href="/privacy" target="_blank">Privacy Policy</a> &amp;{" "}
              <a href="/refund-policy" target="_blank">Refund and Return Policy</a>.
            </span>
          </label>

          {error && (
            <p className="co-err" role="alert">{error}</p>
          )}

          <button type="submit" className="co-place" disabled={pending || !agree}>
            {pending ? "Placing order…" : "PLACE ORDER"}
          </button>
        </div>
      </div>
    </form>
    </>
  );
}
