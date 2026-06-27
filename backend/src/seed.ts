import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';
import { PaymentMethod } from '@prisma/client';

async function main() {
  console.log('Seeding database...');

  // Payment methods
  const paymentMethods: { method: PaymentMethod; label: string }[] = [
    { method: PaymentMethod.CASH, label: 'Cash' },
    { method: PaymentMethod.UPI, label: 'UPI QR' },
    { method: PaymentMethod.CARD, label: 'Card / Digital' },
    { method: PaymentMethod.TEST, label: 'Test Payment (Demo)' },
  ];
  for (const m of paymentMethods) {
    await prisma.paymentMethodConfig.upsert({ where: { method: m.method }, create: { method: m.method, label: m.label, enabled: true }, update: {} });
  }

  // Users
  const users = [
    { email: 'admin@cafe.com', name: 'Admin', password: 'admin123', role: 'ADMIN' as const },
    { email: 'meera@cafe.com', name: 'Meera Pillai', password: 'cashier123', role: 'EMPLOYEE' as const },
    { email: 'vikas@cafe.com', name: 'Vikas Kumar', password: 'employee123', role: 'EMPLOYEE' as const },
  ];
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({ data: { name: u.name, email: u.email, password: await bcrypt.hash(u.password, 12), role: u.role } });
      console.log(`Created user: ${u.email} / ${u.password}`);
    }
  }

  // Categories (veg-only cafe menu)
  const catData = [
    { name: 'Pizza', color: '#ef4444' },
    { name: 'Burgers & Sandwiches', color: '#f59e0b' },
    { name: 'South Indian', color: '#84cc16' },
    { name: 'Snacks & Starters', color: '#10b981' },
    { name: 'Salads & Bowls', color: '#22c55e' },
    { name: 'Pasta & Noodles', color: '#f97316' },
    { name: 'Hot Beverages', color: '#b45309' },
    { name: 'Cold Beverages', color: '#3b82f6' },
    { name: 'Desserts', color: '#ec4899' },
  ];
  const cats: Record<string, string> = {};
  for (const c of catData) {
    const cat = await prisma.category.upsert({ where: { name: c.name }, create: c, update: { color: c.color } });
    cats[c.name] = cat.id;
  }

  // Products — all vegetarian
  const products = [
    // Pizza
    { name: 'Margherita Pizza', category: 'Pizza', price: 249, tax: 5 },
    { name: 'Farmhouse Pizza', category: 'Pizza', price: 299, tax: 5 },
    { name: 'Paneer Tikka Pizza', category: 'Pizza', price: 329, tax: 5 },
    { name: 'Corn & Cheese Pizza', category: 'Pizza', price: 279, tax: 5 },

    // Burgers & Sandwiches
    { name: 'Veg Burger', category: 'Burgers & Sandwiches', price: 129, tax: 5 },
    { name: 'Paneer Burger', category: 'Burgers & Sandwiches', price: 159, tax: 5 },
    { name: 'Aloo Tikki Burger', category: 'Burgers & Sandwiches', price: 109, tax: 5 },
    { name: 'Grilled Veg Sandwich', category: 'Burgers & Sandwiches', price: 139, tax: 5 },
    { name: 'Club Sandwich', category: 'Burgers & Sandwiches', price: 159, tax: 5 },

    // South Indian
    { name: 'Masala Dosa', category: 'South Indian', price: 99, tax: 5 },
    { name: 'Idli Sambar', category: 'South Indian', price: 79, tax: 5 },
    { name: 'Medu Vada', category: 'South Indian', price: 89, tax: 5 },
    { name: 'Uttapam', category: 'South Indian', price: 109, tax: 5 },

    // Snacks & Starters
    { name: 'Veg Spring Rolls', category: 'Snacks & Starters', price: 159, tax: 5 },
    { name: 'Paneer Tikka', category: 'Snacks & Starters', price: 219, tax: 5 },
    { name: 'French Fries', category: 'Snacks & Starters', price: 99, tax: 5 },
    { name: 'Peri Peri Fries', category: 'Snacks & Starters', price: 129, tax: 5 },
    { name: 'Veg Manchurian', category: 'Snacks & Starters', price: 179, tax: 5 },
    { name: 'Cheese Corn Nuggets', category: 'Snacks & Starters', price: 169, tax: 5 },

    // Salads & Bowls
    { name: 'Greek Salad', category: 'Salads & Bowls', price: 149, tax: 5 },
    { name: 'Caesar Salad', category: 'Salads & Bowls', price: 169, tax: 5 },
    { name: 'Sprouts Salad', category: 'Salads & Bowls', price: 119, tax: 5 },

    // Pasta & Noodles
    { name: 'Penne Alfredo', category: 'Pasta & Noodles', price: 219, tax: 5 },
    { name: 'Arrabiata Pasta', category: 'Pasta & Noodles', price: 199, tax: 5 },
    { name: 'Veg Hakka Noodles', category: 'Pasta & Noodles', price: 179, tax: 5 },
    { name: 'Schezwan Noodles', category: 'Pasta & Noodles', price: 189, tax: 5 },

    // Hot Beverages
    { name: 'Masala Chai', category: 'Hot Beverages', price: 49, tax: 12 },
    { name: 'Filter Coffee', category: 'Hot Beverages', price: 59, tax: 12 },
    { name: 'Cappuccino', category: 'Hot Beverages', price: 129, tax: 12 },
    { name: 'Hot Chocolate', category: 'Hot Beverages', price: 139, tax: 12 },
    { name: 'Green Tea', category: 'Hot Beverages', price: 69, tax: 12 },

    // Cold Beverages
    { name: 'Cold Coffee', category: 'Cold Beverages', price: 139, tax: 12 },
    { name: 'Oreo Shake', category: 'Cold Beverages', price: 169, tax: 12 },
    { name: 'Mango Smoothie', category: 'Cold Beverages', price: 159, tax: 12 },
    { name: 'Fresh Lime Soda', category: 'Cold Beverages', price: 69, tax: 12 },
    { name: 'Iced Tea', category: 'Cold Beverages', price: 99, tax: 12 },
    { name: 'Virgin Mojito', category: 'Cold Beverages', price: 129, tax: 12 },

    // Desserts
    { name: 'Chocolate Brownie', category: 'Desserts', price: 139, tax: 5 },
    { name: 'Gulab Jamun', category: 'Desserts', price: 79, tax: 5 },
    { name: 'Chocolate Lava Cake', category: 'Desserts', price: 169, tax: 5 },
    { name: 'Tiramisu', category: 'Desserts', price: 199, tax: 5 },
    { name: 'Gajar Halwa', category: 'Desserts', price: 119, tax: 5 },
  ];
  for (const p of products) {
    const id = `seed-prod-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await prisma.product.upsert({
      where: { id },
      create: { id, name: p.name, categoryId: cats[p.category], price: p.price, tax: p.tax, description: '' },
      update: { price: p.price, tax: p.tax, categoryId: cats[p.category] },
    });
  }
  console.log(`Seeded ${products.length} veg products across ${catData.length} categories`);

  // Floors & Tables
  const ground = await prisma.floor.upsert({ where: { name: 'Ground Floor' }, create: { name: 'Ground Floor' }, update: {} });
  for (let i = 1; i <= 8; i++) {
    const existing = await prisma.table.findFirst({ where: { floorId: ground.id, tableNumber: `T${i}` } });
    if (!existing) {
      await prisma.table.create({ data: { floorId: ground.id, tableNumber: `T${i}`, seats: i <= 4 ? 2 : 4 } });
    }
  }

  const rooftop = await prisma.floor.upsert({ where: { name: 'Rooftop' }, create: { name: 'Rooftop' }, update: {} });
  for (let i = 1; i <= 4; i++) {
    const existing = await prisma.table.findFirst({ where: { floorId: rooftop.id, tableNumber: `R${i}` } });
    if (!existing) {
      await prisma.table.create({ data: { floorId: rooftop.id, tableNumber: `R${i}`, seats: i <= 2 ? 4 : 6 } });
    }
  }

  // Customers
  const customers = [
    { name: 'Rohan Verma', phone: '9812345670', email: 'rohan.verma@gmail.com' },
    { name: 'Anjali Singh', phone: '9823456781', email: 'anjali.singh@gmail.com' },
    { name: 'Karan Malhotra', phone: '9834567892', email: 'karan.m@gmail.com' },
    { name: 'Pooja Iyer', phone: '9845678903', email: 'pooja.iyer@gmail.com' },
    { name: 'Aditya Rao', phone: '9856789014', email: 'aditya.rao@gmail.com' },
    { name: 'Neha Joshi', phone: '9867890125', email: 'neha.joshi@gmail.com' },
    { name: 'Sahil Khanna', phone: '9878901236', email: 'sahil.k@gmail.com' },
    { name: 'Divya Reddy', phone: '9889012347', email: 'divya.reddy@gmail.com' },
  ];
  for (const c of customers) {
    const id = `seed-cust-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await prisma.customer.upsert({ where: { id }, create: { id, ...c }, update: c });
  }
  console.log(`Seeded ${customers.length} customers`);

  // Coupons
  await prisma.coupon.upsert({ where: { code: 'WELCOME10' }, update: {}, create: { code: 'WELCOME10', discountType: 'PERCENTAGE', discountValue: 10, active: true } });
  await prisma.coupon.upsert({ where: { code: 'FLAT50' }, update: {}, create: { code: 'FLAT50', discountType: 'FIXED', discountValue: 50, active: true } });

  // Inventory categories
  const invCats = [
    { name: 'Dairy', color: '#3b82f6', icon: 'Milk' },
    { name: 'Vegetables & Produce', color: '#22c55e', icon: 'Leaf' },
    { name: 'Grains & Flour', color: '#f59e0b', icon: 'Wheat' },
    { name: 'Beverages & Coffee', color: '#6366f1', icon: 'Coffee' },
    { name: 'Spices & Condiments', color: '#ef4444', icon: 'Flame' },
    { name: 'Oils & Fats', color: '#f97316', icon: 'Droplets' },
    { name: 'Packaging', color: '#64748b', icon: 'Package' },
    { name: 'Frozen & Ice Cream', color: '#06b6d4', icon: 'Snowflake' },
    { name: 'Bakery & Bread', color: '#b45309', icon: 'ChefHat' },
  ];
  for (const c of invCats) {
    await prisma.inventoryCategory.upsert({ where: { name: c.name }, create: c, update: {} });
  }

  // Wastage reasons
  const wastageReasons = [
    { name: 'Kitchen Wastage', description: 'Wastage during cooking/preparation', category: 'Kitchen' },
    { name: 'Expired Product', description: 'Product past best-before or expiry date', category: 'Storage' },
    { name: 'Damaged in Storage', description: 'Breakage, spillage or pest damage in storage', category: 'Storage' },
    { name: 'Overproduction', description: 'Prepared more than what was sold', category: 'Kitchen' },
    { name: 'Quality Rejection', description: 'Failed quality check on delivery or prep', category: 'Quality' },
    { name: 'Customer Return', description: 'Dish returned by customer', category: 'Service' },
    { name: 'Spillage / Accident', description: 'Accidental drop or spill', category: 'Accident' },
    { name: 'Cooking Error', description: 'Burnt, under or overcooked dish', category: 'Kitchen' },
    { name: 'Other', description: 'Any unlisted reason', category: 'General' },
  ];
  for (const r of wastageReasons) {
    await prisma.wastageReason.upsert({ where: { name: r.name }, create: r, update: {} });
  }

  console.log('Seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
