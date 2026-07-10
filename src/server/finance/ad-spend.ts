import type { AdChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// CRUD over the AdSpend table — manual ad-spend entries by channel. Amounts are
// paisa, like every money field. `spentOn` decides which month a spend lands in
// on the marketing report, so back-dating is intentional and supported (same
// convention as Expense.incurredOn).

export interface AdSpendInput {
  channel: AdChannel;
  /** Paisa. */
  amount: number;
  spentOn: Date;
  note?: string | null;
  /** Admin username who entered it (audit). Set on create only. */
  createdBy?: string | null;
}

export async function listAdSpendInRange(start: Date, end: Date) {
  return prisma.adSpend.findMany({
    where: { spentOn: { gte: start, lte: end } },
    orderBy: { spentOn: "desc" },
  });
}

export async function getAdSpendById(id: number) {
  return prisma.adSpend.findUnique({ where: { id } });
}

export async function createAdSpend(input: AdSpendInput) {
  return prisma.adSpend.create({
    data: {
      channel: input.channel,
      amount: input.amount,
      spentOn: input.spentOn,
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function updateAdSpend(id: number, input: AdSpendInput) {
  // createdBy is the original author — never overwritten on edit.
  return prisma.adSpend.update({
    where: { id },
    data: {
      channel: input.channel,
      amount: input.amount,
      spentOn: input.spentOn,
      note: input.note ?? null,
    },
  });
}

export async function deleteAdSpend(id: number) {
  await prisma.adSpend.delete({ where: { id } });
}
