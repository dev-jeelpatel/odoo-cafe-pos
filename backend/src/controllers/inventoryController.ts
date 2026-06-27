import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AdjustmentStatus, StockMovementType } from '@prisma/client';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getDashboard(req: Request, res: Response) {
  const [totalItems, outOfStockItems, recentMovements, allItems] = await Promise.all([
    prisma.inventoryItem.count({ where: { active: true } }),
    prisma.inventoryItem.count({ where: { active: true, currentStock: { lte: 0 } } }),
    prisma.stockMovement.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { inventoryItem: true, createdByUser: { select: { name: true } } },
    }),
    prisma.inventoryItem.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { currentStock: 'asc' },
    }),
  ]);

  const lowStock = allItems.filter(i => i.currentStock <= i.minStock);
  const totalValue = allItems.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0);

  res.json({
    totalItems,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStockItems,
    totalValue,
    lowStockList: lowStock.slice(0, 10),
    recentMovements,
  });
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(_req: Request, res: Response) {
  const cats = await prisma.inventoryCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  res.json(cats);
}

export async function createCategory(req: Request, res: Response) {
  const { name, description, color, icon } = req.body;
  const cat = await prisma.inventoryCategory.create({ data: { name, description, color, icon } });
  res.status(201).json(cat);
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params;
  const cat = await prisma.inventoryCategory.update({ where: { id }, data: req.body });
  res.json(cat);
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.inventoryCategory.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
}

// ── Items ─────────────────────────────────────────────────────────────────────
export async function getItems(req: Request, res: Response) {
  const { search, categoryId, status, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = { active: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (categoryId) where.categoryId = categoryId;

  const items = await prisma.inventoryItem.findMany({
    where,
    include: { category: true, supplier: true },
    orderBy: { name: 'asc' },
    skip,
    take: parseInt(limit),
  });

  const filtered = status
    ? items.filter(i => {
        if (status === 'OUT') return i.currentStock <= 0;
        if (status === 'LOW') return i.currentStock > 0 && i.currentStock <= i.minStock;
        if (status === 'OK') return i.currentStock > i.minStock;
        return true;
      })
    : items;

  const total = await prisma.inventoryItem.count({ where });
  res.json({ items: filtered, total });
}

export async function getItem(req: Request, res: Response) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: req.params.id },
    include: { category: true, supplier: true, batches: { orderBy: { purchaseDate: 'asc' } } },
  });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

export async function createItem(req: Request, res: Response) {
  const { name, sku, categoryId, unit, currentStock, minStock, maxStock, unitCost, supplierId, shelfLifeDays, storageLocation, notes } = req.body;
  const item = await prisma.inventoryItem.create({
    data: { name, sku, categoryId, unit, currentStock: currentStock ?? 0, minStock: minStock ?? 0, maxStock, unitCost: unitCost ?? 0, supplierId, shelfLifeDays, storageLocation },
    include: { category: true, supplier: true },
  });
  res.status(201).json(item);
}

export async function updateItem(req: Request, res: Response) {
  try {
    const { name, sku, categoryId, unit, currentStock, minStock, maxStock, unitCost, supplierId, shelfLifeDays, storageLocation, active } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        name,
        sku,
        categoryId,
        unit,
        currentStock: currentStock !== undefined ? parseFloat(String(currentStock)) : undefined,
        minStock: minStock !== undefined ? parseFloat(String(minStock)) : undefined,
        maxStock: maxStock !== null && maxStock !== '' && maxStock !== undefined ? parseFloat(String(maxStock)) : null,
        unitCost: unitCost !== undefined ? parseFloat(String(unitCost)) : undefined,
        supplierId: supplierId || null,
        shelfLifeDays: shelfLifeDays !== undefined ? parseInt(String(shelfLifeDays)) : undefined,
        storageLocation,
        active,
      },
      include: { category: true, supplier: true },
    });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteItem(req: Request, res: Response) {
  await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
}

export async function getItemMovements(req: Request, res: Response) {
  const movements = await prisma.stockMovement.findMany({
    where: { inventoryItemId: req.params.id },
    include: { createdByUser: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(movements);
}

// ── Adjustments ───────────────────────────────────────────────────────────────
export async function getAdjustments(req: Request, res: Response) {
  const { status } = req.query as any;
  const adjustments = await prisma.stockAdjustment.findMany({
    where: status ? { status } : {},
    include: {
      inventoryItem: true,
      requestedByUser: { select: { name: true } },
      approvedByUser: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(adjustments);
}

export async function createAdjustment(req: Request, res: Response) {
  const { inventoryItemId, type, quantity, reason, referenceNumber, notes } = req.body;
  const adj = await prisma.stockAdjustment.create({
    data: { inventoryItemId, type, quantity, reason, referenceNumber: referenceNumber ?? '', notes: notes ?? '', requestedBy: (req as any).user.id },
    include: { inventoryItem: true },
  });
  res.status(201).json(adj);
}

export async function approveAdjustment(req: Request, res: Response) {
  const { id } = req.params;
  const adj = await prisma.stockAdjustment.findUnique({ where: { id }, include: { inventoryItem: true } });
  if (!adj) return res.status(404).json({ message: 'Not found' });
  if (adj.status !== AdjustmentStatus.PENDING) return res.status(400).json({ message: 'Already processed' });

  const item = adj.inventoryItem;
  let newStock = item.currentStock;
  if (adj.type === 'ADD') newStock = item.currentStock + adj.quantity;
  else if (adj.type === 'REMOVE') newStock = item.currentStock - adj.quantity;
  else if (adj.type === 'SET') newStock = adj.quantity;

  await prisma.$transaction([
    prisma.inventoryItem.update({ where: { id: item.id }, data: { currentStock: newStock } }),
    prisma.stockAdjustment.update({ where: { id }, data: { status: AdjustmentStatus.APPROVED, approvedBy: (req as any).user.id } }),
    prisma.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        type: StockMovementType.ADJUSTMENT,
        quantity: newStock - item.currentStock,
        stockBefore: item.currentStock,
        stockAfter: newStock,
        referenceType: 'StockAdjustment',
        referenceId: id,
        createdBy: (req as any).user.id,
      },
    }),
  ]);

  res.json({ ok: true });
}

export async function rejectAdjustment(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.stockAdjustment.update({ where: { id }, data: { status: AdjustmentStatus.REJECTED, approvedBy: (req as any).user.id } });
  res.json({ ok: true });
}

// ── Valuation ─────────────────────────────────────────────────────────────────
export async function getValuation(_req: Request, res: Response) {
  const items = await prisma.inventoryItem.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const rows = items.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category.name,
    unit: i.unit,
    currentStock: i.currentStock,
    unitCost: i.unitCost,
    totalValue: i.currentStock * i.unitCost,
  }));

  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);
  res.json({ items: rows, totalValue });
}

// ── Reports ───────────────────────────────────────────────────────────────────
export async function getStockSummary(_req: Request, res: Response) {
  const items = await prisma.inventoryItem.findMany({
    where: { active: true },
    include: { category: true, supplier: true },
    orderBy: { name: 'asc' },
  });
  res.json(items);
}

export async function getLowStock(_req: Request, res: Response) {
  const items = await prisma.inventoryItem.findMany({
    where: { active: true },
    include: { category: true },
  });
  res.json(items.filter(i => i.currentStock <= i.minStock));
}

export async function getExpiryReport(req: Request, res: Response) {
  const days = parseInt((req.query.days as string) || '30');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const batches = await prisma.inventoryBatch.findMany({
    where: { status: 'ACTIVE', expiryDate: { lte: cutoff } },
    include: { inventoryItem: { include: { category: true } } },
    orderBy: { expiryDate: 'asc' },
  });
  res.json(batches);
}

export async function getMovementsReport(req: Request, res: Response) {
  const { from, to } = req.query as Record<string, string>;
  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  const movements = await prisma.stockMovement.findMany({
    where,
    include: { inventoryItem: true, createdByUser: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(movements);
}
