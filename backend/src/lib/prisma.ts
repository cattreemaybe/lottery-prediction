/**
 * @fileoverview prisma.ts
 * @module backend/src/lib/prisma
 *
 * Input:
//   - ../generated/prisma
 *
 * Output:
//   - prisma
//   - connectDatabase
//   - disconnectDatabase
 *
 * Pos: backend/src/lib/prisma.ts
 */

import { PrismaClient } from '../generated/prisma';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('Database disconnected');
}
