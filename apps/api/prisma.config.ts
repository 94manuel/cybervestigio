import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL ?? env('DATABASE_URL');

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
