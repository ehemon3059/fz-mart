// Shape of a saved address as it crosses the server → client boundary (the
// account address book and the checkout picker both render it). Kept separate
// from server/customers/addresses.ts so client components can import the type
// without pulling Prisma into the bundle.

export interface SavedAddress {
  id: number;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  shippingZoneId: number | null;
  isDefault: boolean;
}

export interface ZoneOption {
  id: number;
  name: string;
  charge: number;
}

/** One-line summary for the checkout dropdown: "Home — Rahim, 017…, House 4…". */
export function summarizeAddress(a: SavedAddress, maxAddressChars = 48): string {
  const street =
    a.address.length > maxAddressChars ? `${a.address.slice(0, maxAddressChars).trimEnd()}…` : a.address;
  return `${a.label} — ${a.fullName}, ${a.phone}, ${street}`;
}
