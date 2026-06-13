import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(cats);
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await prisma.category.create({ data: req.body });
    res.status(201).json(cat);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    res.json(cat);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};
