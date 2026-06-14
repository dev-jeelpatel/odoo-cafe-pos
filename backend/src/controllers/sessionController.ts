import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getSessions = async (_req: Request, res: Response): Promise<void> => {
  const sessions = await prisma.session.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { openedAt: 'desc' },
  });
  res.json(sessions);
};

export const getCurrentSession = async (req: any, res: Response): Promise<void> => {
  const session = await prisma.session.findFirst({
    where: { userId: req.user.id, status: 'OPEN' },
    include: { user: { select: { id: true, name: true } } },
  });
  res.json(session);
};

export const getCurrentSessionSummary = async (req: any, res: Response): Promise<void> => {
  const session = await prisma.session.findFirst({ where: { userId: req.user.id, status: 'OPEN' } });
  if (!session) { res.json(null); return; }

  const orders = await prisma.order.findMany({
    where: { sessionId: session.id, isPaid: true },
    include: { payments: true },
  });

  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;
  const taxCollected = orders.reduce((s, o) => s + o.taxAmount, 0);
  const discountsApplied = orders.reduce((s, o) => s + o.discountAmount, 0);
  const allPayments = orders.flatMap(o => o.payments);
  const cashAmount = allPayments.filter(p => p.paymentMethod === 'CASH').reduce((s, p) => s + p.amount, 0);
  const upiAmount = allPayments.filter(p => p.paymentMethod === 'UPI').reduce((s, p) => s + p.amount, 0);
  const cardAmount = allPayments.filter(p => p.paymentMethod === 'CARD').reduce((s, p) => s + p.amount, 0);

  res.json({
    totalSales, totalOrders, taxCollected, discountsApplied,
    cashAmount, upiAmount, cardAmount,
    cashInHand: session.openingAmount + cashAmount,
    openingAmount: session.openingAmount,
  });
};

export const openSession = async (req: any, res: Response): Promise<void> => {
  const existing = await prisma.session.findFirst({ where: { userId: req.user.id, status: 'OPEN' } });
  if (existing) { res.json(existing); return; }
  const openingAmount = parseFloat(req.body?.openingAmount) || 0;
  const session = await prisma.session.create({ data: { userId: req.user.id, openingAmount } });
  await prisma.auditLog.create({ data: { userId: req.user.id, action: 'SESSION_OPEN', entityType: 'Session', entityId: session.id, details: { openingAmount } } });
  res.status(201).json(session);
};

export const closeSession = async (req: any, res: Response): Promise<void> => {
  try {
    const session = await prisma.session.findFirst({ where: { userId: req.user.id, status: 'OPEN' } });
    if (!session) { res.status(404).json({ message: 'No open session' }); return; }

    const orders = await prisma.order.findMany({
      where: { sessionId: session.id, isPaid: true },
      include: { payments: true },
    });

    const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders = orders.length;
    const taxCollected = orders.reduce((s, o) => s + o.taxAmount, 0);
    const discountsApplied = orders.reduce((s, o) => s + o.discountAmount, 0);
    const allPayments = orders.flatMap(o => o.payments);
    const cashAmount = allPayments.filter(p => p.paymentMethod === 'CASH').reduce((s, p) => s + p.amount, 0);
    const upiAmount = allPayments.filter(p => p.paymentMethod === 'UPI').reduce((s, p) => s + p.amount, 0);
    const cardAmount = allPayments.filter(p => p.paymentMethod === 'CARD').reduce((s, p) => s + p.amount, 0);

    const updated = await prisma.$transaction(async tx => {
      const s = await tx.session.update({
        where: { id: session.id },
        data: { status: 'CLOSED', closedAt: new Date(), totalSales, totalOrders, cashAmount, upiAmount, cardAmount, taxCollected, discountsApplied },
        include: { user: { select: { id: true, name: true } } },
      });
      await tx.auditLog.create({ data: { userId: req.user.id, action: 'SESSION_CLOSE', entityType: 'Session', entityId: session.id, details: { totalSales, totalOrders } } });
      return s;
    });

    res.json(updated);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};
