require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const id = 'd5feebe4-5cd7-4639-b11f-901628a8a99f';
  await prisma.product.update({ where: { id }, data: { discountPercent: 20 } });
  const p = await prisma.product.findUnique({ where: { id } });
  console.log('Set discountPercent to:', p.discountPercent);
  console.log('basePrice:', p.basePrice.toString());
  console.log('Expected discounted unitPrice (20% off 429):', Math.round(429 * 0.8));
}
main().finally(() => prisma.$disconnect());
