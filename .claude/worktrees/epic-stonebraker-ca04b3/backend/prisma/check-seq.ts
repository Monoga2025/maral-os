import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const max = await prisma.quotation.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  const count = await prisma.quotation.count();
  console.log('Max quotation number:', max?.number, '| Total:', count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
