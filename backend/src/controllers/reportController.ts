import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function buildDateFilter(req: Request) {
  const where: any = { isPaid: true };
  const { from, to, period, session, waiter } = req.query;
  const now = new Date();

  if (from && to) {
    where.createdAt = { gte: new Date(from as string), lte: new Date(to as string) };
  } else if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    where.createdAt = { gte: start };
  } else if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    where.createdAt = { gte: start };
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    where.createdAt = { gte: start };
  }

  if (session) where.sessionId = session as string;
  if (waiter) where.employeeId = waiter as string;
  return where;
}

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const where = buildDateFilter(req);

  const [orders, itemAgg] = await Promise.all([
    prisma.order.findMany({
      where,
      select: { totalAmount: true, taxAmount: true, discountAmount: true, createdAt: true, orderNumber: true, items: { select: { productName: true, quantity: true, unitPrice: true, totalPrice: true, product: { select: { category: { select: { name: true, color: true } } } } } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: where },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 10,
    }),
  ]);

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

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

  // Top products from groupBy
  const topProducts = itemAgg.map(a => ({
    productId: a.productId,
    name: a.productName,
    qty: a._sum.quantity || 0,
    revenue: a._sum.totalPrice || 0,
  }));

  // Category revenue
  const catMap: Record<string, { name: string; revenue: number; color: string }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const cat = item.product?.category;
      if (!cat) return;
      if (!catMap[cat.name]) catMap[cat.name] = { name: cat.name, revenue: 0, color: cat.color };
      catMap[cat.name].revenue += item.totalPrice;
    });
  });
  const topCategories = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);

  // Top orders
  const topOrders = [...orders].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10).map(o => ({
    orderNumber: o.orderNumber,
    total: o.totalAmount,
    items: o.items.length,
    createdAt: o.createdAt,
  }));

  res.json({ totalRevenue, totalOrders, avgOrderValue, salesTrend, topProducts, topCategories, topOrders });
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(logs);
};
