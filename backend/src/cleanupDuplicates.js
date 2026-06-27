/**
 * Deactivates duplicate products that share the same name as canonical seed products.
 * Run once: node src/cleanupDuplicates.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEACTIVATE = [
  // duplicate "Cold Coffee" entries (keeping seed-prod-cold-coffee)
  'demo-prod-cold-coffee',
  'cmqc4gep3000iqpy9fa6ve9ve',
  // duplicate "Fresh Lime Soda" (keeping seed-prod-fresh-lime-soda)
  'cmqc4gep5000kqpy91uhgd2xh',
  // duplicate "French Fries" (keeping seed-prod-french-fries)
  'demo-prod-french-fries',
  // duplicate "Veg Burger" (keeping seed-prod-veg-burger)
  'demo-prod-veg-burger',
  // duplicate "Cappuccino" (keeping seed-prod-cappuccino)
  'demo-prod-cappuccino',
  // duplicate "Masala Chai" (keeping seed-prod-masala-chai)
  'demo-prod-masala-chai',
  // duplicate "Chocolate Brownie" same category (keeping seed-prod-chocolate-brownie)
  'cmqc4gep8000mqpy9qxmnrw7o',
  // duplicate "Margherita Pizza" same category (keeping seed-prod-margherita-pizza)
  'cmqc4geoi000aqpy9p9jxj23w',
];

async function main() {
  console.log('Deactivating duplicate products...');
  for (const id of DEACTIVATE) {
    const p = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, active: true } });
    if (!p) { console.log(`  SKIP (not found): ${id}`); continue; }
    await prisma.product.update({ where: { id }, data: { active: false } });
    console.log(`  ✓ Deactivated: ${p.name} (${id})`);
  }

  const active = await prisma.product.count({ where: { active: true } });
  const total = await prisma.product.count();
  console.log(`\nDone. Active products: ${active} / ${total} total`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
