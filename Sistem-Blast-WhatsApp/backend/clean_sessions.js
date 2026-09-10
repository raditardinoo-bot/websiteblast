const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() { 
  await prisma.waSession.deleteMany({}); 
  console.log('Cleaned sessions'); 
} 
run().catch(console.error).finally(()=>prisma.$disconnect());
