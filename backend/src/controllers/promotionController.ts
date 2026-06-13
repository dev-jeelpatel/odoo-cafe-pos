import { Request, Response } from 'express';
import Promotion from '../models/Promotion';

export const getPromotions = async (_req: Request, res: Response): Promise<void> => {
  const promos = await Promotion.find().populate('conditionProduct').sort('-createdAt');
  res.json(promos);
};

export const createPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const promo = await Promotion.create(req.body);
    res.status(201).json(promo);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('conditionProduct');
    if (!promo) { res.status(404).json({ message: 'Promotion not found' }); return; }
    res.json(promo);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
  await Promotion.findByIdAndDelete(req.params.id);
  res.json({ message: 'Promotion deleted' });
};
