/**
 * @fileoverview server.ts
 * @module backend/src/server
 *
 * Input:
//   - ./app
//   - ./config/env
//   - ./lib/prisma
//   - ./lib/redis
 *
 * Output:
//   - (no exports)
 *
 * Pos: backend/src/server.ts
 */

import { createServer } from 'http';
import { createApp } from './app';
import { runtimeConfig } from './config/env';
import { connectDatabase, disconnectDatabase } from './lib/prisma';
import { getRedisClient, disconnectRedis } from './lib/redis';

const app = createApp();
const server = createServer(app);

async function startServer() {
  try {
    await connectDatabase();
    getRedisClient(); // Initialize Redis connection

    server.listen(runtimeConfig.port, () => {
      console.log(`API server listening on http://localhost:${runtimeConfig.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed');
    await disconnectDatabase();
    await disconnectRedis();
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
