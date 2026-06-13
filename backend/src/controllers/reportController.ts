import { Request, Response } from 'express';
import Order from '../models/Order';

function dateFilter(req: Request) {
  const filter: any = { isPaid: true };
  const { from, to, period } = req.query;
  const now = new Date();

  if (from && to) {
    filter.createdAt = { $gte: new Date(from as string), $lte: new Date(to as string) };
  } else if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: start };
  } else if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    filter.createdAt = { $gte: start };
  } else if (period === 'month') {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: start };
  }

  if (req.query.session) filter.session = req.query.session;
  if (req.query.waiter) filter.waiter = req.query.waiter;
  return filter;
}

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const filter = dateFilter(req);
  const orders = await Order.find(filter).populate('items.product');

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // Sales trend by day
  const trendMap: Record<string, { revenue: number; orders: number }> = {};
  orders.forEach(o => {
    const day = o.createdAt.toISOString().split('T')[0];
    if (!trendMap[day]) trendMap[day] = { revenue: 0, orders: 0 };
    trendMap[day].revenue += o.total;
    trendMap[day].orders += 1;
  });
  const salesTrend = Object.entries(trendMap).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date));

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const pid = item.product.toString();
      if (!productMap[pid]) productMap[pid] = { name: item.name, qty: 0, revenue: 0 };
      productMap[pid].qty += item.quantity;
      productMap[pid].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Top orders
  const topOrders = orders.sort((a, b) => b.total - a.total).slice(0, 10).map(o => ({
    orderNumber: o.orderNumber,
    total: o.total,
    items: o.items.length,
    createdAt: o.createdAt,
  }));

  res.json({ totalRevenue, totalOrders, avgOrderValue, salesTrend, topProducts, topOrders });
};
