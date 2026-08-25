"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PaymentMethod } from "@prisma/client";
import { useCartStore, cartSubtotal, cartLineKey, type CartItem } from "@/lib/cart-store";
import { formatTaka } from "@/lib/money";
import { CashIcon, CheckIcon, TrashIcon } from "@/components/storefront/icons";
import type { CheckoutPaymentOptions } from "@/server/settings/payments";
import { placeOrder, applyCoupon, requestCheckoutOtp, confirmCheckoutOtp, syncCart } from "./actions";
import { addAddress } from "../account/actions";
import { recordCheckoutStart } from "../funnel-actions";
import { getFbAttribution } from "@/lib/fb-attribution";
import { readUtmAttribution, type UtmAttribution } from "@/lib/utm-attribution";
import { summarizeAddress, type SavedAddress } from "@/lib/customer-address";
import LocationPicker, {
  chargeForSelection,
  type LocationSelection,
} from "@/components/storefront/LocationPicker";
import type { LocationTree } from "@/server/settings/locations";

interface Props {
  /** Admin-managed Division → District → Upazila tree, priced server-side. */
  locations: LocationTree;
  /** Which payment choices the admin has enabled — nothing secret in here. */
  paymentOptions: CheckoutPaymentOptions;
  /** When set, checkout is for this single product only — bypasses the cart. */
  buyNowProductId: number | null;
  /** The specific size chosen for a Buy Now of a sized product. */
  buyNowVariantId: number | null;
  /** Whether a customer is signed in — enables abandoned-cart persistence. */
  loggedIn: boolean;
  /** The signed-in customer's saved addresses; empty for guests. */
  savedAddresses: SavedAddress[];
  /** How many addresses a customer may keep — gates the "save this one" offer. */
  maxAddresses: number;
  /** Pre-fills the email field for a signed-in customer. */
  contactEmail: string;
}

/** Sentinel for the "type a fresh address" option in the picker. */
const NEW_ADDRESS = "new";

const NOTE_MAX = 90;

export default function CheckoutForm({
  locations,
  paymentOptions,
  buyNowProductId,
  buyNowVariantId,
  loggedIn,
  savedAddresses,
  maxAddresses,
  contactEmail,
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

  // Address book: pre-select the default saved address, else start on a blank
  // form. Guests always get the blank form.
  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null;
  const [addressChoice, setAddressChoice] = useState<number | typeof NEW_ADDRESS>(
    defaultAddress?.id ?? NEW_ADDRESS,
  );
  const [shipping, setShipping] = useState({
    customerName: defaultAddress?.fullName ?? "",
    customerPhone: defaultAddress?.phone ?? "",
    address: defaultAddress?.address ?? "",
    customerEmail: contactEmail,
  });
  // Only offered when the customer is signed in and still under the cap.
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const canSaveMore = loggedIn && savedAddresses.length < maxAddresses;

  // The delivery location drives the charge. Seeded from the default saved
  // address so a returning customer lands on their usual location already priced.
  const [location, setLocation] = useState<LocationSelection>({
    divisionId: defaultAddress?.divisionId ?? null,
    districtId: defaultAddress?.districtId ?? null,
    upazilaId: defaultAddress?.upazilaId ?? null,
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [provider, setProvider] = useState(paymentOptions.providers[0]?.key ?? "");
  const [note, setNote] = useState("");
  // Pre-checked by default so the Place Order button is enabled on load; the
  // customer can still un-tick it to withhold agreement.
  const [agree, setAgree] = useState(true);
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

  function setShippingField(key: keyof typeof shipping, value: string) {
    setShipping((prev) => ({ ...prev, [key]: value }));
  }

  /**
   * Switching the picker replaces the whole shipping block. Choosing "new"
   * blanks the recipient fields (but keeps the email, which is account-level)
   * so nothing from the previous address is silently carried over.
   */
  function chooseAddress(choice: number | typeof NEW_ADDRESS) {
    setAddressChoice(choice);
    if (choice === NEW_ADDRESS) {
      setShipping((prev) => ({
        customerName: "",
        customerPhone: "",
        address: "",
        customerEmail: prev.customerEmail,
      }));
      return;
    }
    const picked = savedAddresses.find((a) => a.id === choice);
    if (!picked) return;
    setSaveNewAddress(false);
    setShipping((prev) => ({
      customerName: picked.fullName,
      customerPhone: picked.phone,
      address: picked.address,
      customerEmail: prev.customerEmail,
    }));
    // Restore the saved location so the dropdowns and the charge match the
    // address the customer just picked.
    if (picked.divisionId != null && picked.districtId != null) {
      setLocation({
        divisionId: picked.divisionId,
        districtId: picked.districtId,
        upazilaId: picked.upazilaId,
      });
    }
  }

  const subtotal = cartSubtotal(checkoutItems);
  // Mirrors the server's resolution so the summary shows the real charge as
  // soon as a district is picked; the server re-resolves at submit regardless.
  const { charge: deliveryCharge, zoneName, resolved: locationPriced } = chargeForSelection(
    locations,
    location,
  );
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

  /**
   * Persist a freshly typed address to the account when the customer ticked
   * the box. Deliberately non-blocking: a full address book or a validation
   * quibble must never stop an order from being placed.
   */
  async function saveAddressIfRequested(formData: FormData) {
    if (!saveNewAddress || addressChoice !== NEW_ADDRESS || !canSaveMore) return;
    const payload = new FormData();
    payload.set("label", String(formData.get("addressLabel") ?? "").trim() || "Home");
    payload.set("fullName", String(formData.get("customerName") ?? ""));
    payload.set("phone", String(formData.get("customerPhone") ?? ""));
    payload.set("address", String(formData.get("address") ?? ""));
    // The zone is derived server-side from these, never sent from here.
    payload.set("divisionId", String(formData.get("divisionId") ?? ""));
    payload.set("districtId", String(formData.get("districtId") ?? ""));
    payload.set("upazilaId", String(formData.get("upazilaId") ?? ""));
    payload.set("isDefault", savedAddresses.length === 0 ? "true" : "false");
    try {
      await addAddress(payload);
    } catch {
      // Ignored on purpose — see the note above.
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      await saveAddressIfRequested(formData);
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

          {/* Saved-address picker — signed-in customers only. Guests fall
              straight through to the blank fields below. */}
          {savedAddresses.length > 0 && (
            <div className="co-field">
              <label htmlFor="savedAddress" className="co-zones-lg" style={{ display: "block", marginBottom: 6 }}>
                Deliver to
              </label>
              <select
                id="savedAddress"
                className="co-select"
                style={{ width: "100%" }}
                value={addressChoice}
                onChange={(e) =>
                  chooseAddress(e.target.value === NEW_ADDRESS ? NEW_ADDRESS : Number(e.target.value))
                }
              >
                {savedAddresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {summarizeAddress(a)}
                    {a.isDefault ? " (default)" : ""}
                  </option>
                ))}
                <option value={NEW_ADDRESS}>+ Use a new address</option>
              </select>
              <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 6 }}>
                {addressChoice === NEW_ADDRESS
                  ? "Enter the new address below."
                  : "You can edit the details below for this order only — your saved address stays as it is."}
              </p>
            </div>
          )}

          <div className="co-row2 co-field">
            <input
              name="customerName"
              required
              className="co-input"
              placeholder="Your full name *"
              value={shipping.customerName}
              onChange={(e) => setShippingField("customerName", e.target.value)}
            />
            <div className="co-phone">
              <span className="cc">88</span>
              <input
                name="customerPhone"
                required
                inputMode="numeric"
                maxLength={11}
                placeholder="017XXXXXXXX"
                value={shipping.customerPhone}
                onChange={(e) =>
                  setShippingField("customerPhone", e.target.value.replace(/\D/g, "").slice(0, 11))
                }
              />
            </div>
          </div>
          {/* Location first, then the street line: narrowing down before
              writing the address is the order Bangladeshi shoppers expect, and
              it means the delivery charge is already on screen. */}
          <LocationPicker
            tree={locations}
            value={location}
            onChange={setLocation}
          />

          <div className="co-field">
            <textarea
              name="address"
              required
              rows={2}
              className="co-area"
              placeholder="ex: House no. / building / street / area"
              value={shipping.address}
              onChange={(e) => setShippingField("address", e.target.value)}
            />
          </div>

          {/* The resolved zone, named — so the customer can see WHY the charge
              is what it is (e.g. Savar billed as sub-urban, not inside-Dhaka). */}
          {locationPriced && zoneName && (
            <div className="co-field">
              <span className="co-zone-badge">
                {zoneName} · {formatTaka(deliveryCharge)}
              </span>
            </div>
          )}
          <div className="co-field">
            <input
              name="customerEmail"
              type="email"
              className="co-input"
              placeholder="Email (optional)"
              value={shipping.customerEmail}
              onChange={(e) => setShippingField("customerEmail", e.target.value)}
            />
          </div>

          {/* Offer to remember a newly typed address, while there's room. */}
          {addressChoice === NEW_ADDRESS && canSaveMore && (
            <div className="co-field">
              <label className="co-terms" style={{ marginBottom: saveNewAddress ? 8 : 0 }}>
                <input
                  type="checkbox"
                  checked={saveNewAddress}
                  onChange={(e) => setSaveNewAddress(e.target.checked)}
                />
                <span>
                  Save this address to my account{" "}
                  <span style={{ color: "var(--ink-mute)" }}>
                    ({savedAddresses.length} of {maxAddresses} used)
                  </span>
                </span>
              </label>
              {saveNewAddress && (
                <input
                  name="addressLabel"
                  className="co-input"
                  maxLength={30}
                  defaultValue="Home"
                  placeholder="Label — Home, Office…"
                  aria-label="Address label"
                />
              )}
            </div>
          )}
          {addressChoice === NEW_ADDRESS && loggedIn && !canSaveMore && (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: -4, marginBottom: 12 }}>
              You&apos;ve saved the maximum of {maxAddresses} addresses. This one will be used for
              this order only.
            </p>
          )}
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
              <span>
                {locationPriced ? formatTaka(deliveryCharge) : "Select your location"}
              </span>
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

          <button
            type="submit"
            className="co-place"
            disabled={pending || !agree || !locationPriced}
          >
            {pending ? "Placing order…" : "PLACE ORDER"}
          </button>
          {!locationPriced && (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8, textAlign: "center" }}>
              Choose your division and district to see the delivery charge.
            </p>
          )}
        </div>
      </div>
    </form>
    </>
  );
}
