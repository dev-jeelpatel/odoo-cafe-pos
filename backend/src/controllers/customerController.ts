import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
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
      const lastVisit = orders.length
        ? orders.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), orders[0].createdAt)
        : null;
      return { ...rest, orderCount: orders.length, totalSpent, lastVisit };
    });

    res.json(result);
  } catch (err: any) { res.status(500).json({ message: 'Failed to fetch customers' }); }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Customer name is required' }); return; }
    const c = await prisma.customer.create({
      data: { name: name.trim(), email: email?.trim() || '', phone: phone?.trim() || '' },
    });
    res.status(201).json(c);
  } catch (err: any) {
    res.status(400).json({ message: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    const c = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name: name?.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
      },
    });
    res.json(c);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Customer not found' }); return; }
    res.status(400).json({ message: 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ message: 'Customer deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Customer not found' }); return; }
    res.status(400).json({ message: 'Failed to delete customer' });
  }
};
