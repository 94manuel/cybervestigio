import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

type RuntimeProcess = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const runtimeDatabaseUrl = (globalThis as RuntimeProcess).process?.env?.DATABASE_URL;
const databaseUrl = runtimeDatabaseUrl ?? env('DATABASE_URL');

if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL is required to run Prisma commands.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
