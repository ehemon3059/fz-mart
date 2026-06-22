import { prisma } from "@/lib/prisma";
import { invalidateFaqCache } from "./cache";

export async function listAllFaqs() {
  return prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getFaqById(id: number) {
  return prisma.faqItem.findUnique({ where: { id } });
}

export interface FaqInput {
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createFaq(input: FaqInput) {
  const faq = await prisma.faqItem.create({
    data: {
      question: input.question,
      answer: input.answer,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await invalidateFaqCache();
  return faq;
}

export async function updateFaq(id: number, input: FaqInput) {
  const faq = await prisma.faqItem.update({
    where: { id },
    data: {
      question: input.question,
      answer: input.answer,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await invalidateFaqCache();
  return faq;
}

export async function deleteFaq(id: number) {
  await prisma.faqItem.delete({ where: { id } });
  await invalidateFaqCache();
}
