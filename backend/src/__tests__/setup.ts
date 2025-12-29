// Set NODE_ENV first before any imports
process.env.NODE_ENV = 'test';

// Load test environment variables from .env.test
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(__dirname, '../../.env.test') });
