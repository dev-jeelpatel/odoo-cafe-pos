import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const productInclude = { category: true };

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const where: any = { active: true };
  if (req.query.category) where.categoryId = req.query.category as string;
  if (req.query.search) where.name = { contains: req.query.search as string, mode: 'insensitive' };
  if (req.query.all === 'true') delete where.active;

  const products = await prisma.product.findMany({ where, include: productInclude, orderBy: { name: 'asc' } });
  res.json(products);
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, categoryId, price, unit, tax, description } = req.body;
    const product = await prisma.product.create({
      data: { name, categoryId, price: parseFloat(price), unit: unit?.toUpperCase() || 'PIECE', tax: parseFloat(tax || 0), description: description || '' },
      include: productInclude,
    });
    res.status(201).json(product);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, categoryId, price, unit, tax, description, active } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, categoryId, price: price !== undefined ? parseFloat(price) : undefined, unit: unit?.toUpperCase(), tax: tax !== undefined ? parseFloat(tax) : undefined, description, active },
      include: productInclude,
    });
    res.json(product);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Product removed' });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};
