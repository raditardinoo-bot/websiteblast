const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password', 10);

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Upsert Test User
  const testuser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      name: 'Test User',
      username: 'testuser',
      password: hashedPassword,
      role: 'USER',
      balance: 10000,
    },
  });

  console.log('Seed completed:', { admin: admin.username, testuser: testuser.username });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
