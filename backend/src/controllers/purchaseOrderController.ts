import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { StockMovementType } from '@prisma/client';

function nextPoNumber() {
  return `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
}
function nextGrnNumber() {
  return `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
}

// ── Purchase Orders ───────────────────────────────────────────────────────────
export async function getPOs(req: Request, res: Response) {
  const { status, supplierId } = req.query as any;
  const where: any = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;

  const pos = await prisma.purchaseOrder.findMany({
    where,
    include: { supplier: true, items: { include: { inventoryItem: true } }, createdByUser: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(pos);
}

export async function getPO(req: Request, res: Response) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, items: { include: { inventoryItem: true } }, grns: { include: { items: true } } },
  });
  if (!po) return res.status(404).json({ message: 'Not found' });
  res.json(po);
}

export async function createPO(req: Request, res: Response) {
  const { supplierId, expectedDate, notes, items } = req.body;
  const totalAmount = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: nextPoNumber(),
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes: notes ?? '',
      totalAmount,
      createdBy: (req as any).user.id,
      items: {
        create: items.map((i: any) => ({
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
        })),
      },
    },
    include: { supplier: true, items: { include: { inventoryItem: true } } },
  });
  res.status(201).json(po);
}

export async function updatePO(req: Request, res: Response) {
  const { status, expectedDate, notes } = req.body;
  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status, expectedDate: expectedDate ? new Date(expectedDate) : undefined, notes },
  });
  res.json(po);
}

export async function sendPO(req: Request, res: Response) {
  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: 'SENT' },
  });
  res.json(po);
}

export async function deletePO(req: Request, res: Response) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!po || po.status !== 'DRAFT') return res.status(400).json({ message: 'Only Draft POs can be deleted' });
  await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}

// ── GRN ──────────────────────────────────────────────────────────────────────
export async function getGRNs(_req: Request, res: Response) {
  const grns = await prisma.goodsReceivedNote.findMany({
    include: { purchaseOrder: { include: { supplier: true } }, receivedByUser: { select: { name: true } }, items: { include: { inventoryItem: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(grns);
}

export async function getGRN(req: Request, res: Response) {
  const grn = await prisma.goodsReceivedNote.findUnique({
    where: { id: req.params.id },
    include: { purchaseOrder: { include: { supplier: true } }, items: { include: { inventoryItem: true } } },
  });
  if (!grn) return res.status(404).json({ message: 'Not found' });
  res.json(grn);
}

export async function createGRN(req: Request, res: Response) {
  const { poId, receivedDate, notes, discrepancyNotes, items } = req.body;
  const userId = (req as any).user.id;

  const grn = await prisma.goodsReceivedNote.create({
    data: {
      grnNumber: nextGrnNumber(),
      poId,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      receivedBy: userId,
      notes: notes ?? '',
      discrepancyNotes: discrepancyNotes ?? '',
      items: {
        create: items.map((i: any) => ({
          inventoryItemId: i.inventoryItemId,
          orderedQty: i.orderedQty,
          receivedQty: i.receivedQty,
          unitPrice: i.unitPrice,
          batchNumber: i.batchNumber ?? '',
          expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
        })),
      },
    },
    include: { items: { include: { inventoryItem: true } } },
  });

  // Update stock for each received item
  for (const gi of grn.items) {
    if (gi.receivedQty <= 0) continue;
    const invItem = await prisma.inventoryItem.findUnique({ where: { id: gi.inventoryItemId } });
    if (!invItem) continue;

    const newStock = invItem.currentStock + gi.receivedQty;
    await prisma.inventoryItem.update({ where: { id: invItem.id }, data: { currentStock: newStock, unitCost: gi.unitPrice } });

    await prisma.stockMovement.create({
      data: {
        inventoryItemId: invItem.id,
        type: StockMovementType.PURCHASE,
        quantity: gi.receivedQty,
        stockBefore: invItem.currentStock,
        stockAfter: newStock,
        referenceType: 'GRN',
        referenceId: grn.id,
        createdBy: userId,
      },
    });

    // Create batch
    if (gi.batchNumber) {
      await prisma.inventoryBatch.create({
        data: {
          inventoryItemId: invItem.id,
          batchNumber: gi.batchNumber,
          quantity: gi.receivedQty,
          unitCost: gi.unitPrice,
          expiryDate: gi.expiryDate,
          supplierId: (await prisma.purchaseOrder.findUnique({ where: { id: poId } }))?.supplierId,
        },
      });
    }
  }

  // Check if PO is fully received
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (po) {
    const allGrns = await prisma.goodsReceivedNote.findMany({ where: { poId }, include: { items: true } });
    const receivedMap: Record<string, number> = {};
    for (const g of allGrns) for (const gi of g.items) {
      receivedMap[gi.inventoryItemId] = (receivedMap[gi.inventoryItemId] || 0) + gi.receivedQty;
    }
    const fullyReceived = po.items.every(pi => (receivedMap[pi.inventoryItemId] || 0) >= pi.quantity);
    await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: fullyReceived ? 'RECEIVED' : 'PARTIAL' } });
  }

  res.status(201).json(grn);
}
