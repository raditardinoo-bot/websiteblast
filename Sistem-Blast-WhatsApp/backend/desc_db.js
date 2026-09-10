const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const res = await prisma.$queryRaw`DESCRIBE AppSetting`;
  console.log(res);
}
run().finally(() => prisma.$disconnect());
