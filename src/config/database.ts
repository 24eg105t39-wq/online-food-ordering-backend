import { PrismaClient } from '@prisma/client';
import { config } from './env';

let prisma: PrismaClient | null = null;
let isConnected = false;

if (config.databaseUrl) {
  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    console.warn('Prisma client initialization skipped or failed:', (err as Error).message);
    prisma = null;
  }
}

export async function testDbConnection(): Promise<boolean> {
  if (!prisma) {
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    isConnected = true;
    return true;
  } catch (err) {
    isConnected = false;
    return false;
  }
}

export function getPrisma(): PrismaClient | null {
  return prisma;
}

export function isDbConnected(): boolean {
  return isConnected;
}
