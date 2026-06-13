import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getPromotions = async (_req: Request, res: Response): Promise<void> => {
  const promos = await prisma.promotion.findMany({ include: { conditionProduct: true }, orderBy: { createdAt: 'desc' } });
  res.json(promos);
};

export const createPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, promotionType, conditionProductId, minQuantity, minOrderAmount, discountType, discountValue } = req.body;
    const promo = await prisma.promotion.create({
      data: {
        name, promotionType: promotionType.toUpperCase(),
        conditionProductId: conditionProductId || null,
        minQuantity: minQuantity ? parseInt(minQuantity) : null,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        discountType: discountType.toUpperCase(), discountValue: parseFloat(discountValue),
      },
      include: { conditionProduct: true },
    });
    res.status(201).json(promo);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, promotionType, conditionProductId, minQuantity, minOrderAmount, discountType, discountValue, active } = req.body;
    const promo = await prisma.promotion.update({
      where: { id: req.params.id },
      data: {
        name, promotionType: promotionType?.toUpperCase(),
        conditionProductId: conditionProductId || null,
        minQuantity: minQuantity ? parseInt(minQuantity) : null,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        discountType: discountType?.toUpperCase(), discountValue: discountValue !== undefined ? parseFloat(discountValue) : undefined, active,
      },
      include: { conditionProduct: true },
    });
    res.json(promo);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
  await prisma.promotion.delete({ where: { id: req.params.id } });
  res.json({ message: 'Promotion deleted' });
};
