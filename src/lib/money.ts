// Prices are stored as integers in paisa (1 BDT = 100 paisa) to avoid
// floating-point rounding on money. These helpers convert at the edges.

export function paisaToTaka(paisa: number): number {
  return paisa / 100;
}

export function takaToPaisa(taka: number): number {
  return Math.round(taka * 100);
}

/**
 * Sell price for a cost and a target GROSS MARGIN, in paisa.
 *
 *   price = cost / (1 − margin/100)
 *
 * A margin is a share of the SELLING price: 25% on a ৳346 landed cost is
 * ৳461.33, of which ৳115.33 — a quarter — is profit. That is not the same
 * sum as 25% on top of the cost (৳432.50); the option rows use that other one
 * (`priceFromCost` in the product form) because it is the one an admin means
 * when pricing a matrix off per-option costs.
 *
 * Margins of 100% or more are refused rather than clamped: the formula divides
 * by zero at 100 and turns negative above it, so there is no honest answer to
 * return. Null means "no price can be worked out", which callers show as a
 * blank rather than a wrong figure.
 */
export function priceFromMargin(costPaisa: number, marginPct: number): number | null {
  if (!Number.isFinite(costPaisa) || costPaisa <= 0) return null;
  if (!Number.isFinite(marginPct) || marginPct < 0 || marginPct >= 100) return null;
  return Math.round(costPaisa / (1 - marginPct / 100));
}

export function formatTaka(paisa: number): string {
  return `৳${paisaToTaka(paisa).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Resolve the admin-chosen price colour into an inline style, falling back to
 * the theme default when unset. Takes the variant colour first, then the
 * product's — a selected variant overrides its parent.
 *
 * The value lands in a `style` attribute, so it is re-validated as a literal
 * #rrggbb here rather than trusted from the DB: the write path already
 * sanitises it, but a row predating that check (or written by any other
 * caller) must not be able to inject a CSS declaration. Returns undefined for
 * "no colour set", so callers can spread it and keep their default classes.
 */
export function priceColorStyle(
  ...candidates: (string | null | undefined)[]
): { color: string } | undefined {
  for (const c of candidates) {
    if (c && /^#[0-9a-f]{6}$/i.test(c)) return { color: c };
  }
  return undefined;
}
