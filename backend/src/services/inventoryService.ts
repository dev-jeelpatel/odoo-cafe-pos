import prisma from '../lib/prisma';
import { StockMovementType } from '@prisma/client';

export async function deductForOrder(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  for (const item of order.items) {
    const recipe = await prisma.recipe.findUnique({
      where: { productId: item.productId },
      include: { ingredients: { include: { inventoryItem: true } } },
    });
    if (!recipe || !recipe.active) continue;

    for (const ing of recipe.ingredients) {
      const deductQty = ing.quantity * item.quantity;
      const invItem = await prisma.inventoryItem.findUnique({ where: { id: ing.inventoryItemId } });
      if (!invItem) continue;

      const newStock = invItem.currentStock - deductQty;
      await prisma.inventoryItem.update({
        where: { id: invItem.id },
        data: { currentStock: newStock },
      });

      await prisma.stockMovement.create({
        data: {
          inventoryItemId: invItem.id,
          type: StockMovementType.ORDER_DEDUCTION,
          quantity: -deductQty,
          stockBefore: invItem.currentStock,
          stockAfter: newStock,
          referenceType: 'Order',
          referenceId: orderId,
          createdBy: userId,
        },
      });

      // Low stock notification
      if (newStock <= invItem.minStock) {
        const type = newStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
        await prisma.invNotification.create({
          data: {
            type: type as any,
            title: newStock <= 0 ? 'Out of Stock' : 'Low Stock Alert',
            message: `${invItem.name}: ${newStock.toFixed(2)} ${invItem.unit} remaining${newStock <= invItem.minStock ? ` (min: ${invItem.minStock})` : ''}`,
            priority: newStock <= 0 ? 'CRITICAL' : 'HIGH',
            relatedEntityType: 'InventoryItem',
            relatedEntityId: invItem.id,
            userId,
          },
        });
      }
    }
  }
}

export async function restoreForOrder(orderId: string, userId: string) {
  const movements = await prisma.stockMovement.findMany({
    where: { referenceId: orderId, type: StockMovementType.ORDER_DEDUCTION },
  });

  for (const mv of movements) {
    const invItem = await prisma.inventoryItem.findUnique({ where: { id: mv.inventoryItemId } });
    if (!invItem) continue;

    const restoreQty = Math.abs(mv.quantity);
    const newStock = invItem.currentStock + restoreQty;

    await prisma.inventoryItem.update({
      where: { id: invItem.id },
      data: { currentStock: newStock },
    });

    await prisma.stockMovement.create({
      data: {
        inventoryItemId: invItem.id,
        type: StockMovementType.ORDER_RESTORE,
        quantity: restoreQty,
        stockBefore: invItem.currentStock,
        stockAfter: newStock,
        referenceType: 'Order',
        referenceId: orderId,
        createdBy: userId,
      },
    });
  }
}
