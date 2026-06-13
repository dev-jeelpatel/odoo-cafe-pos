import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

async function main() {
  console.log('Seeding database...');

  // Payment methods
  for (const m of [
    { method: 'CASH' as const, label: 'Cash' },
    { method: 'UPI' as const, label: 'UPI QR' },
    { method: 'CARD' as const, label: 'Card / Digital' },
  ]) {
    await prisma.paymentMethodConfig.upsert({ where: { method: m.method }, create: { ...m, enabled: true }, update: {} });
  }

  // Admin user
  const existing = await prisma.user.findUnique({ where: { email: 'admin@cafe.com' } });
  if (!existing) {
    await prisma.user.create({
      data: { name: 'Admin', email: 'admin@cafe.com', password: await bcrypt.hash('admin123', 12), role: 'ADMIN' },
    });
    console.log('Created admin user: admin@cafe.com / admin123');
  }

  // Categories
  const catData = [
    { name: 'Pizza', color: '#ef4444' },
    { name: 'Burgers', color: '#f59e0b' },
    { name: 'Drinks', color: '#3b82f6' },
    { name: 'Desserts', color: '#ec4899' },
    { name: 'Starters', color: '#10b981' },
  ];
  const cats: Record<string, string> = {};
  for (const c of catData) {
    const cat = await prisma.category.upsert({ where: { name: c.name }, create: c, update: { color: c.color } });
    cats[c.name] = cat.id;
  }

  // Products
  const products = [
    { name: 'Margherita Pizza', categoryId: cats['Pizza'], price: 280, tax: 5 },
    { name: 'Pepperoni Pizza', categoryId: cats['Pizza'], price: 350, tax: 5 },
    { name: 'Classic Burger', categoryId: cats['Burgers'], price: 180, tax: 5 },
    { name: 'Cheese Burger', categoryId: cats['Burgers'], price: 220, tax: 5 },
    { name: 'Cold Coffee', categoryId: cats['Drinks'], price: 120, tax: 12 },
    { name: 'Fresh Lime Soda', categoryId: cats['Drinks'], price: 80, tax: 12 },
    { name: 'Chocolate Brownie', categoryId: cats['Desserts'], price: 150, tax: 5 },
    { name: 'Spring Rolls', categoryId: cats['Starters'], price: 160, tax: 5 },
  ];
  for (const p of products) {
    await prisma.product.upsert({ where: { id: p.name }, create: { ...p, description: '' }, update: {} }).catch(() =>
      prisma.product.create({ data: { ...p, description: '' } }).catch(() => {})
    );
  }

  // Floor & Tables
  const floor = await prisma.floor.upsert({ where: { name: 'Ground Floor' }, create: { name: 'Ground Floor' }, update: {} });
  for (let i = 1; i <= 8; i++) {
    const existing = await prisma.table.findFirst({ where: { floorId: floor.id, tableNumber: String(i) } });
    if (!existing) {
      await prisma.table.create({ data: { floorId: floor.id, tableNumber: String(i), seats: i <= 4 ? 2 : 4 } });
    }
  }

  console.log('Seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
