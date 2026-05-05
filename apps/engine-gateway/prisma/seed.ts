import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.SUPER_ADMIN_EMAIL    ?? 'admin@flashengine.dev';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'admin123456';

  const passwordHash = await bcrypt.hash(password, 12);
  const publicKey    = crypto.randomUUID();

  const admin = await prisma.client.upsert({
    where:  { email },
    update: {},
    create: {
      email,
      passwordHash,
      role:      'SUPER_ADMIN',
      name:      'Platform Admin',
      publicKey,
    },
  });

  console.log(`Seeded SUPER_ADMIN: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
