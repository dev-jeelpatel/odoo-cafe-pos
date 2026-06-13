import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { generateOrderNumber, generateReceiptNumber } from '../utils/orderNumber';

const ORDER_INCLUDE = {
  customer: true,
  table: { include: { floor: true } },
  employee: { select: { id: true, name: true } },
  session: true,
  promotion: true,
  items: { include: { product: { include: { category: true } } } },
  payments: true,
  receipts: true,
};

function calcTotals(items: Array<{ price: number; quantity: number; tax: number }>) {
  let subtotal = 0, taxAmount = 0;
  items.forEach(i => {
    const line = i.price * i.quantity;
    subtotal += line;
    taxAmount += (line * i.tax) / 100;
  });
  return { subtotal, taxAmount };
}

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.status) where.status = (req.query.status as string).toUpperCase();
  if (req.query.kitchenStatus) where.kitchenStatus = (req.query.kitchenStatus as string).toUpperCase();
  if (req.query.session) where.sessionId = req.query.session as string;
  if (req.query.search) where.orderNumber = { contains: req.query.search as string, mode: 'insensitive' };

  const take = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const skip = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  const orders = await prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, take, skip });
  res.json(orders);
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
};

export const createOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const session = await prisma.session.findFirst({ where: { userId: req.user.id, status: 'OPEN' } });
    const orderNumber = await generateOrderNumber();
    const { items = [], customerId, tableId, orderType, notes, promotionDiscount = 0, couponDiscount = 0, couponCode, promotionId } = req.body;

    const { subtotal, taxAmount } = calcTotals(items.map((i: any) => ({ price: i.price, quantity: i.quantity, tax: i.tax || 0 })));
    const discountAmount = (promotionDiscount || 0) + (couponDiscount || 0);
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customerId || null,
        tableId: tableId || null,
        employeeId: req.user.id,
        sessionId: session?.id || null,
        orderType: (orderType || 'DINE_IN').toUpperCase().replace('-', '_'),
        notes: notes || '',
        subtotal, taxAmount, discountAmount, totalAmount,
        couponCode: couponCode || null,
        promotionId: promotionId || null,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId || i.product,
            productName: i.name || i.productName,
            categoryColor: i.categoryColor || null,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity,
            tax: i.tax || 0,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    if (tableId) await prisma.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });

    res.status(201).json(order);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const updateOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ message: 'Order not found' }); return; }
    if (existing.isPaid) { res.status(400).json({ message: 'Cannot edit a paid order' }); return; }

    const { items, customerId, tableId, orderType, notes, promotionDiscount, couponDiscount, couponCode, promotionId } = req.body;

    let updateData: any = { customerId, tableId, notes, couponCode: couponCode || null, promotionId: promotionId || null };
    if (orderType) updateData.orderType = orderType.toUpperCase().replace('-', '_');

    if (items) {
      const { subtotal, taxAmount } = calcTotals(items.map((i: any) => ({ price: i.price, quantity: i.quantity, tax: i.tax || 0 })));
      const discountAmount = (promotionDiscount || 0) + (couponDiscount || 0);
      updateData = { ...updateData, subtotal, taxAmount, discountAmount, totalAmount: Math.max(0, subtotal + taxAmount - discountAmount) };

      await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
      await prisma.orderItem.createMany({
        data: items.map((i: any) => ({
          orderId: req.params.id,
          productId: i.productId || i.product,
          productName: i.name || i.productName,
          categoryColor: i.categoryColor || null,
          quantity: i.quantity, unitPrice: i.price, totalPrice: i.price * i.quantity, tax: i.tax || 0,
        })),
      });
    }

    const order = await prisma.order.update({ where: { id: req.params.id }, data: updateData, include: ORDER_INCLUDE });
    res.json(order);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  const { code, subtotal } = req.body;
  const coupon = await prisma.coupon.findFirst({
    where: { code: code.toUpperCase(), active: true, OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
  });
  if (!coupon) { res.status(404).json({ message: 'Invalid coupon code' }); return; }
  const discount = coupon.discountType === 'PERCENTAGE' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
  res.json({ coupon, discount: Math.min(discount, subtotal) });
};

export const applyPromotions = async (req: Request, res: Response): Promise<void> => {
  const { items, subtotal } = req.body;
  const promos = await prisma.promotion.findMany({ where: { active: true }, include: { conditionProduct: true } });

  let bestDiscount = 0, bestPromo = null;
  for (const promo of promos) {
    let qualifies = false;
    if (promo.promotionType === 'ORDER' && promo.minOrderAmount && subtotal >= promo.minOrderAmount) {
      qualifies = true;
    } else if (promo.promotionType === 'PRODUCT' && promo.conditionProductId && promo.minQuantity) {
      const item = items.find((i: any) => (i.productId || i.product) === promo.conditionProductId);
      if (item && item.quantity >= promo.minQuantity) qualifies = true;
    }
    if (qualifies) {
      const disc = promo.discountType === 'PERCENTAGE' ? (subtotal * promo.discountValue) / 100 : promo.discountValue;
      if (disc > bestDiscount) { bestDiscount = disc; bestPromo = promo; }
    }
  }
  res.json({ promotion: bestPromo, discount: bestDiscount });
};

export const sendToKitchen = async (req: any, res: Response): Promise<void> => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { kitchenStatus: 'TO_COOK', status: 'CONFIRMED' },
    include: ORDER_INCLUDE,
  });
  req.io?.emit('kitchen:new-order', order);
  req.io?.emit('order:updated', order);
  res.json(order);
};

export const updateKitchenStatus = async (req: any, res: Response): Promise<void> => {
  const { kitchenStatus } = req.body;
  const ks = kitchenStatus.toUpperCase().replace('-', '_');
  const status = ks === 'COMPLETED' ? 'READY' : 'PREPARING';
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { kitchenStatus: ks, status },
    include: ORDER_INCLUDE,
  });
  req.io?.emit('kitchen:status-update', order);
  req.io?.emit('order:updated', order);
  res.json(order);
};

export const updateItemKitchenStatus = async (req: any, res: Response): Promise<void> => {
  await prisma.orderItem.update({
    where: { id: req.params.itemId },
    data: { kitchenCompleted: req.body.kitchenCompleted },
  });
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
  req.io?.emit('kitchen:item-update', { orderId: req.params.id, itemId: req.params.itemId, kitchenCompleted: req.body.kitchenCompleted });
  res.json(order);
};

export const processPayment = async (req: any, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payments: true } });
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    if (order.isPaid) { res.status(400).json({ message: 'Order already paid' }); return; }

    const { payments } = req.body;
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
    if (totalPaid < order.totalAmount) { res.status(400).json({ message: 'Insufficient payment amount' }); return; }

    const receiptNumber = await generateReceiptNumber();

    const result = await prisma.$transaction(async tx => {
      // Create payments
      await tx.payment.createMany({
        data: payments.map((p: any) => ({
          orderId: order.id,
          paymentMethod: p.method.toUpperCase(),
          amount: p.amount,
          transactionId: p.transactionId || null,
          referenceNumber: p.reference || null,
          paymentStatus: 'SUCCESS',
          paidAt: new Date(),
        })),
      });

      // Mark order paid
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { isPaid: true, status: 'COMPLETED' },
        include: ORDER_INCLUDE,
      });

      // Free table
      if (order.tableId) {
        await tx.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
      }

      // Create receipt
      await tx.receipt.create({
        data: { orderId: order.id, receiptNumber, receiptData: { orderNumber: order.orderNumber, total: order.totalAmount, payments } },
      });

      // Audit log
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'PAYMENT', entityType: 'Order', entityId: order.id, details: { amount: totalPaid, methods: payments.map((p: any) => p.method) } },
      });

      return updated;
    });

    req.io?.emit('order:paid', result);
    if (order.tableId) req.io?.emit('table:status-update', { tableId: order.tableId, status: 'AVAILABLE' });
    res.json({ ...result, receiptNumber });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
};

export const cancelOrder = async (req: any, res: Response): Promise<void> => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
    include: ORDER_INCLUDE,
  });
  if (order.tableId) await prisma.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
  req.io?.emit('order:updated', order);
  res.json(order);
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.isPaid) { res.status(400).json({ message: 'Cannot delete a paid order' }); return; }
  await prisma.order.delete({ where: { id: req.params.id } });
  if (order.tableId) await prisma.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
  res.json({ message: 'Order deleted' });
};
