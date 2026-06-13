import { Request, Response } from 'express';
import Coupon from '../models/Coupon';

export const getCoupons = async (_req: Request, res: Response): Promise<void> => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json(coupons);
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) { res.status(404).json({ message: 'Coupon not found' }); return; }
    res.json(coupon);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ message: 'Coupon deleted' });
};

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase(), isActive: true });
  if (!coupon) { res.status(404).json({ message: 'Invalid or inactive coupon' }); return; }
  res.json(coupon);
};
