import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCoupons = async (_req: Request, res: Response): Promise<void> => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(coupons);
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, expiryDate } = req.body;
    const coupon = await prisma.coupon.create({
      data: { code: code.toUpperCase(), discountType: discountType.toUpperCase(), discountValue: parseFloat(discountValue), expiryDate: expiryDate ? new Date(expiryDate) : null },
    });
    res.status(201).json(coupon);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, active, expiryDate } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: { code: code?.toUpperCase(), discountType: discountType?.toUpperCase(), discountValue: discountValue !== undefined ? parseFloat(discountValue) : undefined, active, expiryDate: expiryDate ? new Date(expiryDate) : undefined },
    });
    res.json(coupon);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ message: 'Coupon deleted' });
};

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  const coupon = await prisma.coupon.findFirst({
    where: { code: req.params.code.toUpperCase(), active: true, OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
  });
  if (!coupon) { res.status(404).json({ message: 'Invalid or expired coupon' }); return; }
  res.json(coupon);
};
