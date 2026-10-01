import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '.development.env' });

const user = encodeURIComponent(process.env.DB_USERNAME ?? '');
const password = encodeURIComponent(process.env.DB_PASSWORD ?? '');
const host = process.env.DB_HOST ?? 'localhost';
const port = process.env.DB_PORT ?? '5432';
const database = process.env.DB_NAME ?? '';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: `postgresql://${user}:${password}@${host}:${port}/${database}`,
  },
});
