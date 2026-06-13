import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
  const methods = await prisma.paymentMethodConfig.findMany({ orderBy: { method: 'asc' } });
  res.json(methods);
};

export const togglePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: any = {};
    if (req.body.enabled !== undefined) data.enabled = req.body.enabled;
    if (req.body.upiId !== undefined) data.upiId = req.body.upiId;
    const method = await prisma.paymentMethodConfig.update({ where: { id: req.params.id }, data });
    res.json(method);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};
