import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectToDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully.');
    return true;
  } catch (error: any) {
    console.warn('⚠️ Database connection failed:', error?.message);
    return false;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;