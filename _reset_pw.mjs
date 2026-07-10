import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const hash = await bcrypt.hash("admin123", 12);
const u = await prisma.adminUser.update({
  where: { username: "admin" },
  data: { passwordHash: hash, twoFactorEnabled: false, twoFactorSecret: null },
  select: { username: true, role: true, twoFactorEnabled: true },
});
console.log("reset:", JSON.stringify(u));
await prisma.$disconnect();
