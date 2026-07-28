import { prisma } from "@/lib/prisma";
import type { CustomerAddress } from "@prisma/client";

// Customer address book. Each customer may keep at most MAX_ADDRESSES saved
// delivery addresses; the cap is enforced here because SQL cannot express a
// per-parent row limit. Every mutation re-checks ownership by scoping the
// query to (id, customerId), so one customer can never touch another's row.

export const MAX_ADDRESSES = 3;

export const ADDRESS_LABELS = ["Home", "Office", "Other"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

export interface AddressInput {
  label: string;
  fullName: string;
  phone: string;
  address: string;
  shippingZoneId: number | null;
  isDefault: boolean;
}

/** Default first, then oldest first — a stable order for the picker. */
export async function listAddresses(customerId: string): Promise<CustomerAddress[]> {
  return prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function countAddresses(customerId: string): Promise<number> {
  return prisma.customerAddress.count({ where: { customerId } });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Because every mutation below serialises on the customer's row lock, a burst
 * of concurrent submits queues rather than running in parallel. Prisma's
 * default 2s `maxWait` is too tight for that queue — it throws P2028 instead of
 * waiting its turn — so both bounds are widened. They still cap a pathological
 * wait rather than hanging the request.
 */
const TX_OPTIONS = { maxWait: 8000, timeout: 15000 } as const;

/**
 * Serialise every address mutation for one customer by locking their Customer
 * row. Required for both invariants this module maintains — the 3-address cap
 * and "exactly one default" — because each is a read-then-write pair that
 * REPEATABLE READ alone lets two concurrent transactions interleave. Verified:
 * without this, parallel calls produce 5 saved addresses and 2 defaults.
 *
 * Callers that then need a fresh count must ALSO read with FOR UPDATE — the
 * lock does not refresh the transaction's snapshot.
 */
async function lockCustomer(tx: Tx, customerId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM Customer WHERE id = ${customerId} FOR UPDATE`;
}

/**
 * Clear every other default for this customer, so `isDefault` holds at most one
 * row. Runs inside the caller's transaction, which must already hold the
 * customer lock.
 */
async function clearOtherDefaults(
  tx: Tx,
  customerId: string,
  keepId?: number,
): Promise<void> {
  await tx.customerAddress.updateMany({
    where: { customerId, isDefault: true, ...(keepId ? { id: { not: keepId } } : {}) },
    data: { isDefault: false },
  });
}

/**
 * Add an address. Returns null when the customer is already at the cap.
 *
 * The count is read with FOR UPDATE, not via `count()`: lockCustomer only
 * serialises the transactions, it does not refresh this one's snapshot, so a
 * plain count would still return the stale pre-lock value.
 */
export async function createAddress(
  customerId: string,
  input: AddressInput,
): Promise<CustomerAddress | null> {
  return prisma.$transaction(async (tx) => {
    await lockCustomer(tx, customerId);
    const existing = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM CustomerAddress WHERE customerId = ${customerId} FOR UPDATE
    `;
    const count = existing.length;
    if (count >= MAX_ADDRESSES) return null;
    // The very first address is always the default — otherwise a customer
    // could end up with addresses but nothing pre-selected at checkout.
    const isDefault = input.isDefault || count === 0;
    if (isDefault) await clearOtherDefaults(tx, customerId);
    return tx.customerAddress.create({
      data: { ...input, customerId, isDefault },
    });
  }, TX_OPTIONS);
}

/** Update one address in place. Returns null when it isn't this customer's. */
export async function updateAddress(
  customerId: string,
  id: number,
  input: AddressInput,
): Promise<CustomerAddress | null> {
  return prisma.$transaction(async (tx) => {
    await lockCustomer(tx, customerId);
    const existing = await tx.customerAddress.findFirst({ where: { id, customerId } });
    if (!existing) return null;
    // Un-ticking "default" on the only default would leave the customer with
    // none, so the flag can be turned on here but never off by itself.
    const isDefault = input.isDefault || existing.isDefault;
    if (isDefault) await clearOtherDefaults(tx, customerId, id);
    return tx.customerAddress.update({
      where: { id },
      data: { ...input, isDefault },
    });
  }, TX_OPTIONS);
}

/**
 * Delete an address. If it was the default, the oldest remaining one is
 * promoted so the customer always has a default while any address exists.
 */
export async function deleteAddress(customerId: string, id: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await lockCustomer(tx, customerId);
    const existing = await tx.customerAddress.findFirst({ where: { id, customerId } });
    if (!existing) return false;
    await tx.customerAddress.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return true;
  }, TX_OPTIONS);
}

export async function setDefaultAddress(customerId: string, id: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await lockCustomer(tx, customerId);
    const existing = await tx.customerAddress.findFirst({ where: { id, customerId } });
    if (!existing) return false;
    await clearOtherDefaults(tx, customerId, id);
    await tx.customerAddress.update({ where: { id }, data: { isDefault: true } });
    return true;
  }, TX_OPTIONS);
}
