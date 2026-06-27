import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getSuppliers(_req: Request, res: Response) {
  const suppliers = await prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  res.json(suppliers);
}

export async function getSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!supplier) return res.status(404).json({ message: 'Not found' });
  res.json(supplier);
}

export async function createSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.create({ data: req.body });
  res.status(201).json(supplier);
}

export async function updateSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
  res.json(supplier);
}

export async function deleteSupplier(req: Request, res: Response) {
  await prisma.supplier.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
}
