const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vendor = await prisma.vendor.upsert({
    where: { email: 'admin@skipq.com' },
    update: {},
    create: {
      name: 'SkipQ Main Vendor',
      email: 'admin@skipq.com',
    },
  });

  const queue = await prisma.queue.upsert({
    where: {
      vendorId_name: {
        vendorId: vendor.id,
        name: 'Main Queue'
      }
    },
    update: {},
    create: {
      vendorId: vendor.id,
      name: 'Main Queue',
      prefix: 'A',
      avgWaitTime: 300, // 5 mins
    },
  });

  console.log('Database seeded:', { vendor, queue });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
