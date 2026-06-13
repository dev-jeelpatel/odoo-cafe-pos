import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.search) {
    const s = req.query.search as string;
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];
  }
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      orders: { where: { isPaid: true }, select: { totalAmount: true, createdAt: true } },
    },
  });

  const result = customers.map(c => {
    const { orders, ...rest } = c;
    const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);
    const lastVisit = orders.length ? orders.reduce((latest, o) => o.createdAt > latest ? o.createdAt : latest, orders[0].createdAt) : null;
    return { ...rest, orderCount: orders.length, totalSpent, lastVisit };
  });

  res.json(result);
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const c = await prisma.customer.create({ data: { name: req.body.name, email: req.body.email || '', phone: req.body.phone || '' } });
    res.status(201).json(c);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const c = await prisma.customer.update({ where: { id: req.params.id }, data: { name: req.body.name, email: req.body.email, phone: req.body.phone } });
    res.json(c);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.json({ message: 'Customer deleted' });
};
