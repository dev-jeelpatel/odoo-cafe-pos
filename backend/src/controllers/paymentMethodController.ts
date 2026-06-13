import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
  const methods = await prisma.paymentMethodConfig.findMany({ orderBy: { method: 'asc' } });
  res.json(methods);
};

export const togglePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const method = await prisma.paymentMethodConfig.update({
      where: { id: req.params.id },
      data: { enabled: req.body.enabled !== undefined ? req.body.isEnabled ?? req.body.enabled : undefined },
    });
    res.json(method);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};
