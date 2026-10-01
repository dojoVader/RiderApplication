import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';

config({ path: '.development.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }),
});

// Development-only credentials shared by every seeded account.
const SEED_PASSWORD = 'Password123!';

const users: { email: string; role: Role }[] = [
  { email: 'rider@example.com', role: Role.RIDER },
  { email: 'driver1@example.com', role: Role.DRIVER },
  { email: 'driver2@example.com', role: Role.DRIVER },
  { email: 'driver3@example.com', role: Role.DRIVER },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Upsert on email so the seed can be re-run safely.
  for (const { email, role } of users) {
    await prisma.user.upsert({
      where: { email },
      update: { role },
      create: { email, role, passwordHash },
    });
  }

  console.log(
    `Seeded ${users.length} users (password: ${SEED_PASSWORD}):\n` +
      users.map((u) => `  ${u.role.padEnd(6)} ${u.email}`).join('\n'),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
