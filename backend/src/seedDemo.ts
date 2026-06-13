import 'dotenv/config';
import prisma from './lib/prisma';

async function seedDemo() {
  console.log('🌱 Seeding demo data...');

  // ── Customers ─────────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({ where: { id: 'demo-cust-1' }, update: {}, create: { id: 'demo-cust-1', name: 'Riya Sharma', phone: '9876543210', email: 'riya@gmail.com' } }),
    prisma.customer.upsert({ where: { id: 'demo-cust-2' }, update: {}, create: { id: 'demo-cust-2', name: 'Arjun Mehta', phone: '9123456780', email: 'arjun@gmail.com' } }),
    prisma.customer.upsert({ where: { id: 'demo-cust-3' }, update: {}, create: { id: 'demo-cust-3', name: 'Priya Nair', phone: '9988776655', email: 'priya@gmail.com' } }),
    prisma.customer.upsert({ where: { id: 'demo-cust-4' }, update: {}, create: { id: 'demo-cust-4', name: 'Vikram Patel', phone: '9001122334', email: 'vikram@gmail.com' } }),
    prisma.customer.upsert({ where: { id: 'demo-cust-5' }, update: {}, create: { id: 'demo-cust-5', name: 'Sneha Kapoor', phone: '8877665544', email: 'sneha@gmail.com' } }),
  ]);
  console.log(`✅ ${customers.length} customers`);

  // ── Categories & Products ─────────────────────────────────────────────────
  const catHot = await prisma.category.upsert({ where: { name: 'Hot Drinks' }, update: {}, create: { name: 'Hot Drinks', color: '#ef4444' } });
  const catCold = await prisma.category.upsert({ where: { name: 'Cold Drinks' }, update: {}, create: { name: 'Cold Drinks', color: '#3b82f6' } });
  const catFood = await prisma.category.upsert({ where: { name: 'Food' }, update: {}, create: { name: 'Food', color: '#f59e0b' } });
  const catDessert = await prisma.category.upsert({ where: { name: 'Desserts' }, update: {}, create: { name: 'Desserts', color: '#ec4899' } });
  console.log('✅ 4 categories');

  const products: any[] = [];
  const prodData = [
    { name: 'Espresso', categoryId: catHot.id, price: 80, tax: 5 },
    { name: 'Cappuccino', categoryId: catHot.id, price: 150, tax: 5 },
    { name: 'Latte', categoryId: catHot.id, price: 160, tax: 5 },
    { name: 'Masala Chai', categoryId: catHot.id, price: 60, tax: 5 },
    { name: 'Cold Coffee', categoryId: catCold.id, price: 180, tax: 5 },
    { name: 'Mango Shake', categoryId: catCold.id, price: 160, tax: 5 },
    { name: 'Iced Lemon Tea', categoryId: catCold.id, price: 120, tax: 5 },
    { name: 'Grilled Sandwich', categoryId: catFood.id, price: 180, tax: 12 },
    { name: 'Paneer Wrap', categoryId: catFood.id, price: 220, tax: 12 },
    { name: 'Veg Burger', categoryId: catFood.id, price: 200, tax: 12 },
    { name: 'French Fries', categoryId: catFood.id, price: 130, tax: 12 },
    { name: 'Chocolate Cake', categoryId: catDessert.id, price: 250, tax: 5 },
    { name: 'Brownie', categoryId: catDessert.id, price: 180, tax: 5 },
  ];
  for (const p of prodData) {
    const prod = await prisma.product.upsert({ where: { id: `demo-prod-${p.name.replace(/ /g,'-').toLowerCase()}` }, update: {}, create: { id: `demo-prod-${p.name.replace(/ /g,'-').toLowerCase()}`, ...p, description: `Freshly prepared ${p.name}`, active: true } });
    products.push(prod);
  }
  console.log(`✅ ${products.length} products`);

  // ── Floor & Tables ────────────────────────────────────────────────────────
  const floor = await prisma.floor.upsert({ where: { name: 'Ground Floor' }, update: {}, create: { name: 'Ground Floor' } });
  const tableNums = ['T1','T2','T3','T4','T5','T6'];
  const tables: any[] = [];
  for (const tn of tableNums) {
    const t = await prisma.table.upsert({ where: { id: `demo-table-${tn}` }, update: {}, create: { id: `demo-table-${tn}`, floorId: floor.id, tableNumber: tn, seats: 4, status: 'AVAILABLE' } });
    tables.push(t);
  }
  console.log(`✅ ${tables.length} tables on Ground Floor`);

  // ── Admin user (for orders) ───────────────────────────────────────────────
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) { console.log('❌ No admin user found. Run npm run db:seed first.'); process.exit(1); }

  // ── Session ───────────────────────────────────────────────────────────────
  let session = await prisma.session.findFirst({ where: { status: 'OPEN' } });
  if (!session) {
    session = await prisma.session.create({ data: { userId: admin.id, status: 'OPEN', openingAmount: 1000 } });
    console.log('✅ Open session created');
  }

  // ── Helper ────────────────────────────────────────────────────────────────
  let orderSeq = (await prisma.order.count()) + 1;
  const makeOrderNumber = () => `ORD-${String(orderSeq++).padStart(4,'0')}`;

  const makeOrder = async (opts: {
    customer?: any; table?: any; type: any; status: any; kitchenStatus: any;
    isPaid?: boolean; items: { product: any; qty: number }[];
    paymentMethod?: 'CASH'|'UPI'|'CARD';
  }) => {
    const subtotal = opts.items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const taxAmount = opts.items.reduce((s, i) => s + (i.product.price * i.qty * (i.product.tax / 100)), 0);
    const totalAmount = subtotal + taxAmount;

    const order = await prisma.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        customerId: opts.customer?.id,
        tableId: opts.table?.id,
        employeeId: admin!.id,
        sessionId: session!.id,
        orderType: opts.type,
        status: opts.status,
        kitchenStatus: opts.kitchenStatus,
        subtotal, taxAmount, totalAmount,
        isPaid: opts.isPaid || false,
        items: {
          create: opts.items.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            categoryColor: '#6366f1',
            quantity: i.qty,
            unitPrice: i.product.price,
            totalPrice: i.product.price * i.qty,
            tax: i.product.tax,
            kitchenCompleted: opts.kitchenStatus === 'COMPLETED',
          })),
        },
      },
    });

    if (opts.isPaid && opts.paymentMethod) {
      await prisma.payment.create({ data: { orderId: order.id, paymentMethod: opts.paymentMethod, amount: totalAmount, paymentStatus: 'SUCCESS', paidAt: new Date() } });
      const rCount = await prisma.receipt.count();
      await prisma.receipt.create({ data: { orderId: order.id, receiptNumber: `RCP-${String(rCount + 1).padStart(4,'0')}`, receiptData: { total: totalAmount, method: opts.paymentMethod } } });
    }

    if (opts.table && opts.status !== 'COMPLETED' && opts.status !== 'CANCELLED') {
      await prisma.table.update({ where: { id: opts.table.id }, data: { status: 'OCCUPIED' } });
    }
    return order;
  };

  const [esp, cap, lat, chai, cold, mango, lemon, sand, wrap, burger, fries, cake, brownie] = products;

  // ── Active orders visible in POS & KDS ───────────────────────────────────
  await makeOrder({ customer: customers[0], table: tables[0], type: 'DINE_IN', status: 'PREPARING', kitchenStatus: 'TO_COOK', items: [{ product: cap, qty: 2 }, { product: sand, qty: 1 }] });
  await makeOrder({ customer: customers[1], table: tables[1], type: 'DINE_IN', status: 'PREPARING', kitchenStatus: 'PREPARING', items: [{ product: lat, qty: 1 }, { product: wrap, qty: 2 }, { product: fries, qty: 1 }] });
  await makeOrder({ customer: customers[2], table: tables[2], type: 'DINE_IN', status: 'CONFIRMED', kitchenStatus: 'TO_COOK', items: [{ product: cold, qty: 2 }, { product: burger, qty: 1 }] });
  await makeOrder({ type: 'TAKEAWAY', status: 'PENDING', kitchenStatus: 'TO_COOK', items: [{ product: esp, qty: 1 }, { product: brownie, qty: 2 }] });
  await makeOrder({ type: 'DELIVERY', status: 'PREPARING', kitchenStatus: 'PREPARING', items: [{ product: mango, qty: 2 }, { product: cake, qty: 1 }] });
  await makeOrder({ customer: customers[3], table: tables[3], type: 'DINE_IN', status: 'READY', kitchenStatus: 'COMPLETED', items: [{ product: chai, qty: 3 }, { product: fries, qty: 2 }] });
  await makeOrder({ customer: customers[4], table: tables[4], type: 'DINE_IN', status: 'SERVED', kitchenStatus: 'COMPLETED', items: [{ product: lemon, qty: 2 }, { product: sand, qty: 2 }] });
  console.log('✅ 7 active orders (visible in POS & KDS)');

  // ── Completed paid orders (for reports) ───────────────────────────────────
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  for (let i = 0; i < 8; i++) {
    const methods: ('CASH'|'UPI'|'CARD')[] = ['CASH','UPI','CARD','CASH','UPI','CASH','CARD','UPI'];
    const itemSets = [
      [{ product: cap, qty: 2 }, { product: sand, qty: 1 }],
      [{ product: lat, qty: 1 }, { product: cake, qty: 1 }],
      [{ product: cold, qty: 2 }, { product: fries, qty: 2 }],
      [{ product: esp, qty: 3 }, { product: brownie, qty: 1 }],
      [{ product: mango, qty: 1 }, { product: burger, qty: 1 }],
      [{ product: chai, qty: 2 }, { product: wrap, qty: 2 }],
      [{ product: lemon, qty: 1 }, { product: cake, qty: 2 }],
      [{ product: cap, qty: 1 }, { product: sand, qty: 1 }, { product: fries, qty: 1 }],
    ];
    await makeOrder({ type: 'DINE_IN', status: 'COMPLETED', kitchenStatus: 'COMPLETED', isPaid: true, paymentMethod: methods[i], items: itemSets[i] });
  }
  console.log('✅ 8 completed & paid orders (visible in Reports)');

  // ── Coupons ───────────────────────────────────────────────────────────────
  await prisma.coupon.upsert({ where: { code: 'WELCOME10' }, update: {}, create: { code: 'WELCOME10', discountType: 'PERCENTAGE', discountValue: 10, active: true } });
  await prisma.coupon.upsert({ where: { code: 'FLAT50' }, update: {}, create: { code: 'FLAT50', discountType: 'FIXED', discountValue: 50, active: true } });
  await prisma.coupon.upsert({ where: { code: 'SAVE20' }, update: {}, create: { code: 'SAVE20', discountType: 'PERCENTAGE', discountValue: 20, active: true } });
  console.log('✅ 3 coupons');

  // ── Promotions ────────────────────────────────────────────────────────────
  await prisma.promotion.upsert({ where: { id: 'demo-promo-1' }, update: {}, create: { id: 'demo-promo-1', name: 'Happy Hour', promotionType: 'ORDER', minOrderAmount: 400, discountType: 'PERCENTAGE', discountValue: 10, active: true } });
  await prisma.promotion.upsert({ where: { id: 'demo-promo-2' }, update: {}, create: { id: 'demo-promo-2', name: 'Buy 2 Coffees', promotionType: 'PRODUCT', conditionProductId: cap.id, minQuantity: 2, discountType: 'FIXED', discountValue: 50, active: true } });
  console.log('✅ 2 promotions');

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('   👉 Open http://localhost:3000 → login: admin@cafe.com / admin123');
  console.log('   👉 KDS: http://localhost:3000/kds');
  console.log('   👉 API Docs: http://localhost:5000/docs');
  await prisma.$disconnect();
}

seedDemo().catch(e => { console.error(e); process.exit(1); });
