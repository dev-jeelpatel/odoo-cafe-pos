import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCoupons = async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch { res.status(500).json({ message: 'Failed to fetch coupons' }); }
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, expiryDate } = req.body;
    if (!code?.trim()) { res.status(400).json({ message: 'Coupon code is required' }); return; }
    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discountType: discountType.toUpperCase(),
        discountValue: parseFloat(discountValue),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
    res.status(201).json(coupon);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(400).json({ message: 'Coupon code already exists' }); return; }
    res.status(400).json({ message: 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, active, expiryDate } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        code: code?.trim().toUpperCase(),
        discountType: discountType?.toUpperCase(),
        discountValue: discountValue !== undefined ? parseFloat(discountValue) : undefined,
        active,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
    res.json(coupon);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Coupon not found' }); return; }
    res.status(400).json({ message: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ message: 'Coupon deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Coupon not found' }); return; }
    res.status(400).json({ message: 'Failed to delete coupon' });
  }
};

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: req.params.code.trim().toUpperCase(),
        active: true,
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
    });
    if (!coupon) { res.status(404).json({ message: 'Invalid or expired coupon' }); return; }
    res.json(coupon);
  } catch { res.status(500).json({ message: 'Failed to validate coupon' }); }
};
