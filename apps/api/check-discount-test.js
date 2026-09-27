require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst({ where: { isAvailable: true } });
  if (!p) { console.log('No available product found'); return; }
  console.log('id:', p.id);
  console.log('name:', p.name);
  console.log('basePrice:', p.basePrice.toString());
  console.log('discountPercent:', p.discountPercent);
  console.log('discountDisabled:', p.discountDisabled);
}
main().finally(() => prisma.$disconnect());
