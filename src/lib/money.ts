// Prices are stored as integers in paisa (1 BDT = 100 paisa) to avoid
// floating-point rounding on money. These helpers convert at the edges.

export function paisaToTaka(paisa: number): number {
  return paisa / 100;
}

export function takaToPaisa(taka: number): number {
  return Math.round(taka * 100);
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
