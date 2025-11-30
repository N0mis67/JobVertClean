// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}