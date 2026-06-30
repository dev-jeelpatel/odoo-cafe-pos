import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (err: any) { res.status(500).json({ message: 'Failed to fetch categories' }); }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Category name is required' }); return; }
    const cat = await prisma.category.create({ data: { name: name.trim(), color: color || '#6366f1' } });
    res.status(201).json(cat);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(400).json({ message: 'Category name already exists' }); return; }
    res.status(400).json({ message: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    const cat = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: name?.trim(), color },
    });
    res.json(cat);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Category not found' }); return; }
    if (err.code === 'P2002') { res.status(400).json({ message: 'Category name already exists' }); return; }
    res.status(400).json({ message: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ message: 'Category not found' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ message: 'Cannot delete category with existing products' }); return; }
    res.status(400).json({ message: 'Failed to delete category' });
  }
};
