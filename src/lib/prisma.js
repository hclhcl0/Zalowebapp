import { PrismaClient } from "@prisma/client";

// Singleton pattern - tránh tạo quá nhiều connection khi hot-reload trong dev
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
