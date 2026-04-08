import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'nxtlvltechllc@gmail.com';
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  const org = await prisma.organization.upsert({
    where: { slug: 'nxt-lvl-technology-solutions' },
    update: {},
    create: {
      name: 'Nxt Lvl Technology Solutions',
      slug: 'nxt-lvl-technology-solutions',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      firstName: 'John',
      lastName: 'Steele',
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: { role: 'owner' },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'owner',
    },
  });

  console.log('Seeded admin + org');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
