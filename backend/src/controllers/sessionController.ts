import { Request, Response } from 'express';
import Session from '../models/Session';
import Order from '../models/Order';

export const getSessions = async (_req: Request, res: Response): Promise<void> => {
  const sessions = await Session.find().populate('user', 'name email').sort('-openedAt');
  res.json(sessions);
};

export const getCurrentSession = async (req: any, res: Response): Promise<void> => {
  const session = await Session.findOne({ user: req.user._id, isOpen: true });
  res.json(session);
};

export const openSession = async (req: any, res: Response): Promise<void> => {
  const existing = await Session.findOne({ user: req.user._id, isOpen: true });
  if (existing) { res.json(existing); return; }
  const session = await Session.create({ user: req.user._id });
  res.status(201).json(session);
};

export const closeSession = async (req: any, res: Response): Promise<void> => {
  const session = await Session.findOne({ user: req.user._id, isOpen: true });
  if (!session) { res.status(404).json({ message: 'No open session' }); return; }

  const orders = await Order.find({ session: session._id, isPaid: true });
  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const taxCollected = orders.reduce((s, o) => s + o.taxAmount, 0);
  const discountsApplied = orders.reduce((s, o) => s + o.promotionDiscount + o.couponDiscount, 0);
  const cashAmount = orders.flatMap(o => o.payments).filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
  const upiAmount = orders.flatMap(o => o.payments).filter(p => p.method === 'upi').reduce((s, p) => s + p.amount, 0);
  const cardAmount = orders.flatMap(o => o.payments).filter(p => p.method === 'card').reduce((s, p) => s + p.amount, 0);

  session.isOpen = false;
  session.closedAt = new Date();
  session.summary = { totalSales, totalOrders, cashAmount, upiAmount, cardAmount, taxCollected, discountsApplied };
  await session.save();
  res.json(session);
};
