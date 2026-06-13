import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function getDateRange(req: Request) {
  const { from, to, period } = req.query;
  const now = new Date();
  let start: Date;
  let end: Date = now;

  if (from && to) {
    start = new Date(from as string);
    end = new Date(to as string);
  } else if (period === 'week') {
    start = new Date(now); start.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    // today
    start = new Date(now); start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function buildWhere(start: Date, end: Date, req: Request) {
  const { session, waiter } = req.query;
  const where: any = { isPaid: true, createdAt: { gte: start, lte: end } };
  if (session) where.sessionId = session as string;
  if (waiter) where.employeeId = waiter as string;
  return where;
}

const pct = (current: number, previous: number): number | null => {
  if (!previous) return current ? 100 : null;
  return ((current - previous) / previous) * 100;
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const { start, end } = getDateRange(req);
  const where = buildWhere(start, end, req);

  // Previous period of equal length, immediately preceding
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - duration);
  const prevWhere = buildWhere(prevStart, prevEnd, req);

  const [orders, prevOrders, itemAgg, payments] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        totalAmount: true, taxAmount: true, discountAmount: true, subtotal: true,
        createdAt: true, orderNumber: true, orderType: true,
        items: { select: { productName: true, quantity: true, unitPrice: true, totalPrice: true, product: { select: { category: { select: { name: true, color: true } } } } } },
      },
    }),
    prisma.order.findMany({ where: prevWhere, select: { totalAmount: true } }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: where },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { order: where, paymentStatus: 'SUCCESS' },
      select: { paymentMethod: true, amount: true },
    }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0);
  const totalDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  const prevRevenue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const prevOrderCount = prevOrders.length;
  const prevAvgOrderValue = prevOrderCount ? prevRevenue / prevOrderCount : 0;

  // Sales trend by day
  const trendMap: Record<string, { revenue: number; orders: number }> = {};
  orders.forEach(o => {
    const day = o.createdAt.toISOString().split('T')[0];
    if (!trendMap[day]) trendMap[day] = { revenue: 0, orders: 0 };
    trendMap[day].revenue += o.totalAmount;
    trendMap[day].orders += 1;
  });
  const salesTrend = Object.entries(trendMap)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Sales by hour of day
  const hourMap: Record<number, { revenue: number; orders: number }> = {};
  orders.forEach(o => {
    const hour = o.createdAt.getHours();
    if (!hourMap[hour]) hourMap[hour] = { revenue: 0, orders: 0 };
    hourMap[hour].revenue += o.totalAmount;
    hourMap[hour].orders += 1;
  });
  const salesByHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h.toString().padStart(2, '0')}:00`,
    revenue: hourMap[h]?.revenue || 0,
    orders: hourMap[h]?.orders || 0,
  }));

  // Top products from groupBy
  const topProducts = itemAgg.map(a => ({
    productId: a.productId,
    name: a.productName,
    qty: a._sum.quantity || 0,
    revenue: a._sum.totalPrice || 0,
  }));

  // Category revenue
  const catMap: Record<string, { name: string; revenue: number; qty: number; color: string }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const cat = item.product?.category;
      if (!cat) return;
      if (!catMap[cat.name]) catMap[cat.name] = { name: cat.name, revenue: 0, qty: 0, color: cat.color };
      catMap[cat.name].revenue += item.totalPrice;
      catMap[cat.name].qty += item.quantity;
    });
  });
  const topCategories = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);

  // Order type breakdown
  const typeMap: Record<string, { revenue: number; orders: number }> = {};
  orders.forEach(o => {
    if (!typeMap[o.orderType]) typeMap[o.orderType] = { revenue: 0, orders: 0 };
    typeMap[o.orderType].revenue += o.totalAmount;
    typeMap[o.orderType].orders += 1;
  });
  const orderTypeBreakdown = Object.entries(typeMap).map(([type, d]) => ({ type, ...d }));

  // Payment method breakdown
  const payMap: Record<string, { amount: number; count: number }> = {};
  payments.forEach(p => {
    if (!payMap[p.paymentMethod]) payMap[p.paymentMethod] = { amount: 0, count: 0 };
    payMap[p.paymentMethod].amount += p.amount;
    payMap[p.paymentMethod].count += 1;
  });
  const paymentBreakdown = Object.entries(payMap).map(([method, d]) => ({ method, ...d }));

  // Top orders
  const topOrders = [...orders].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10).map(o => ({
    orderNumber: o.orderNumber,
    total: o.totalAmount,
    items: o.items.length,
    createdAt: o.createdAt,
    orderType: o.orderType,
  }));

  res.json({
    totalRevenue, totalOrders, avgOrderValue, totalTax, totalDiscount, totalItems,
    revenueChange: pct(totalRevenue, prevRevenue),
    ordersChange: pct(totalOrders, prevOrderCount),
    avgOrderChange: pct(avgOrderValue, prevAvgOrderValue),
    salesTrend, salesByHour, topProducts, topCategories, topOrders,
    orderTypeBreakdown, paymentBreakdown,
  });
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(logs);
};
