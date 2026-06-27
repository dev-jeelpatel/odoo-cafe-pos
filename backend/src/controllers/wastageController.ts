import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { StockMovementType, WastageStatus } from '@prisma/client';

// ── Reasons ───────────────────────────────────────────────────────────────────
export async function getReasons(_req: Request, res: Response) {
  const reasons = await prisma.wastageReason.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  res.json(reasons);
}

export async function createReason(req: Request, res: Response) {
  const reason = await prisma.wastageReason.create({ data: req.body });
  res.status(201).json(reason);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getWastageDashboard(_req: Request, res: Response) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

  const [monthEntries, weekEntries, pending, recent] = await Promise.all([
    prisma.wastageEntry.findMany({ where: { status: WastageStatus.APPROVED, date: { gte: monthStart } } }),
    prisma.wastageEntry.findMany({ where: { status: WastageStatus.APPROVED, date: { gte: weekStart } } }),
    prisma.wastageEntry.count({ where: { status: WastageStatus.PENDING } }),
    prisma.wastageEntry.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { inventoryItem: { select: { name: true } }, reason: true, reportedByUser: { select: { name: true } } },
    }),
  ]);

  const monthCost = monthEntries.reduce((s, e) => s + e.cost, 0);
  const weekCost = weekEntries.reduce((s, e) => s + e.cost, 0);
  const itemsWasted = new Set(monthEntries.map(e => e.inventoryItemId)).size;

  res.json({ monthCost, weekCost, itemsWasted, pending, recent });
}

// ── Entries ───────────────────────────────────────────────────────────────────
export async function getEntries(req: Request, res: Response) {
  const { status, from, to } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const entries = await prisma.wastageEntry.findMany({
    where,
    include: {
      inventoryItem: { select: { name: true, unit: true } },
      reason: true,
      reportedByUser: { select: { name: true } },
      approvedByUser: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(entries);
}

export async function getEntry(req: Request, res: Response) {
  const entry = await prisma.wastageEntry.findUnique({
    where: { id: req.params.id },
    include: { inventoryItem: true, reason: true, reportedByUser: { select: { name: true } }, approvedByUser: { select: { name: true } } },
  });
  if (!entry) return res.status(404).json({ message: 'Not found' });
  res.json(entry);
}

export async function createEntry(req: Request, res: Response) {
  const { inventoryItemId, date, quantity, reasonId, notes, shift } = req.body;

  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) return res.status(404).json({ message: 'Inventory item not found' });

  const cost = quantity * item.unitCost;

  const entry = await prisma.wastageEntry.create({
    data: {
      inventoryItemId,
      date: date ? new Date(date) : new Date(),
      quantity,
      unit: item.unit,
      reasonId,
      cost,
      notes: notes ?? '',
      shift: shift ?? 'MORNING',
      reportedBy: (req as any).user.id,
    },
    include: { inventoryItem: { select: { name: true } }, reason: true },
  });
  res.status(201).json(entry);
}

export async function updateEntry(req: Request, res: Response) {
  const { id } = req.params;
  const entry = await prisma.wastageEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== WastageStatus.PENDING) return res.status(400).json({ message: 'Cannot edit' });

  const item = await prisma.inventoryItem.findUnique({ where: { id: entry.inventoryItemId } });
  const quantity = req.body.quantity ?? entry.quantity;
  const cost = item ? quantity * item.unitCost : entry.cost;

  const updated = await prisma.wastageEntry.update({ where: { id }, data: { ...req.body, cost } });
  res.json(updated);
}

export async function approveEntry(req: Request, res: Response) {
  const { id } = req.params;
  const entry = await prisma.wastageEntry.findUnique({ where: { id }, include: { inventoryItem: true } });
  if (!entry) return res.status(404).json({ message: 'Not found' });
  if (entry.status !== WastageStatus.PENDING) return res.status(400).json({ message: 'Already processed' });

  const item = entry.inventoryItem;
  const newStock = Math.max(0, item.currentStock - entry.quantity);
  const userId = (req as any).user.id;

  await prisma.$transaction([
    prisma.wastageEntry.update({ where: { id }, data: { status: WastageStatus.APPROVED, approvedBy: userId, approvedAt: new Date() } }),
    prisma.inventoryItem.update({ where: { id: item.id }, data: { currentStock: newStock } }),
    prisma.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        type: StockMovementType.WASTAGE,
        quantity: -entry.quantity,
        stockBefore: item.currentStock,
        stockAfter: newStock,
        referenceType: 'WastageEntry',
        referenceId: id,
        createdBy: userId,
      },
    }),
  ]);

  res.json({ ok: true });
}

export async function rejectEntry(req: Request, res: Response) {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  await prisma.wastageEntry.update({
    where: { id },
    data: { status: WastageStatus.REJECTED, rejectionReason: rejectionReason ?? '', approvedBy: (req as any).user.id },
  });
  res.json({ ok: true });
}

export async function deleteEntry(req: Request, res: Response) {
  const { id } = req.params;
  const entry = await prisma.wastageEntry.findUnique({ where: { id } });
  if (!entry || entry.status === WastageStatus.APPROVED) return res.status(400).json({ message: 'Cannot delete approved wastage' });
  await prisma.wastageEntry.delete({ where: { id } });
  res.json({ ok: true });
}

// ── Reports ───────────────────────────────────────────────────────────────────
export async function getWastageSummary(req: Request, res: Response) {
  const { from, to } = req.query as Record<string, string>;
  const where: any = { status: WastageStatus.APPROVED };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const entries = await prisma.wastageEntry.findMany({
    where,
    include: { inventoryItem: { include: { category: true } }, reason: true, reportedByUser: { select: { id: true, name: true } } },
  });

  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  const totalQty = entries.reduce((s, e) => s + e.quantity, 0);

  // By reason
  const byReason: Record<string, { name: string; cost: number; count: number }> = {};
  for (const e of entries) {
    const k = e.reasonId;
    if (!byReason[k]) byReason[k] = { name: e.reason.name, cost: 0, count: 0 };
    byReason[k].cost += e.cost;
    byReason[k].count += 1;
  }

  // By employee
  const byEmployee: Record<string, { name: string; cost: number; count: number }> = {};
  for (const e of entries) {
    const k = e.reportedBy;
    if (!byEmployee[k]) byEmployee[k] = { name: e.reportedByUser.name, cost: 0, count: 0 };
    byEmployee[k].cost += e.cost;
    byEmployee[k].count += 1;
  }

  // By item
  const byItem: Record<string, { name: string; qty: number; cost: number }> = {};
  for (const e of entries) {
    const k = e.inventoryItemId;
    if (!byItem[k]) byItem[k] = { name: e.inventoryItem.name, qty: 0, cost: 0 };
    byItem[k].qty += e.quantity;
    byItem[k].cost += e.cost;
  }

  res.json({
    totalCost,
    totalQty,
    count: entries.length,
    byReason: Object.values(byReason).sort((a, b) => b.cost - a.cost),
    byEmployee: Object.values(byEmployee).sort((a, b) => b.cost - a.cost),
    byItem: Object.values(byItem).sort((a, b) => b.cost - a.cost),
  });
}
