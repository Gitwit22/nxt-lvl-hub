import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const org = await prisma.organization.findUnique({
    where: { slug: 'nxt-lvl-technology-solutions' },
    include: { memberships: { include: { user: true } } },
  });

  console.log('Organization:', JSON.stringify(org, null, 2));
}

verify()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
