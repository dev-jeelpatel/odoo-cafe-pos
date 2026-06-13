import { Request, Response } from 'express';
import Product from '../models/Product';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const filter: any = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
  const products = await Product.find(filter).populate('category').sort('name');
  res.json(products);
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.create(req.body);
    const populated = await product.populate('category');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('category');
    if (!product) { res.status(404).json({ message: 'Product not found' }); return; }
    res.json(product);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted' });
};
