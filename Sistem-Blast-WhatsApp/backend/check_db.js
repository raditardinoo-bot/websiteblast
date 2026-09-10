const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sessions = await prisma.waSession.findMany();
  console.log('Sessions:', sessions);
  
  const targets = await prisma.targetNumber.findMany({take: 5, orderBy: {id: 'desc'}});
  console.log('Targets:', targets);
  
  const campaigns = await prisma.campaign.findMany({where: {status: 'ACTIVE'}});
  console.log('Campaign:', campaigns);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
