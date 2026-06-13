import { Request, Response } from 'express';
import Category from '../models/Category';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await Category.find().sort('name');
  res.json(categories);
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cat) { res.status(404).json({ message: 'Category not found' }); return; }
    res.json(cat);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted' });
};
