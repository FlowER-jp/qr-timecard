import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

// Always cache — ensures connection is reused on warm serverless instances (prod + dev)
globalForPrisma.prisma = prisma;
