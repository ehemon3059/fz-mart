import { prisma } from "@/lib/prisma";

// Customer profile: the editable contact details behind /account/profile.
//
// `email` is NOT here on purpose — it is the sign-in identity (magic link /
// Google), so changing it would lock the customer out of their own account.
// `contactEmail` covers "reach me at this other address instead".

export interface ProfileInput {
  name: string;
  phone: string;
  contactEmail: string;
}

export async function getProfile(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      contactEmail: true,
      provider: true,
      createdAt: true,
    },
  });
}

/** Blank fields are stored as null rather than "" so "unset" has one meaning. */
export async function updateProfile(customerId: string, input: ProfileInput): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: input.name.trim() || null,
      phone: input.phone.trim() || null,
      contactEmail: input.contactEmail.trim() || null,
    },
  });
}
