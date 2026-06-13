import { Request, Response } from 'express';
import Order from '../models/Order';
import Table from '../models/Table';
import Coupon from '../models/Coupon';
import Promotion from '../models/Promotion';
import Session from '../models/Session';
import { generateOrderNumber } from '../utils/orderNumber';

function calcTotals(items: any[]) {
  let subtotal = 0;
  let taxAmount = 0;
  items.forEach(item => {
    const lineTotal = item.price * item.quantity;
    const lineTax = (lineTotal * item.tax) / 100;
    subtotal += lineTotal;
    taxAmount += lineTax;
  });
  return { subtotal, taxAmount };
}

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kitchenStatus) filter.kitchenStatus = req.query.kitchenStatus;
  if (req.query.session) filter.session = req.query.session;
  if (req.query.isPaid !== undefined) filter.isPaid = req.query.isPaid === 'true';
  if (req.query.source === 'menu') filter.waiter = { $exists: false };
  if (req.query.search) {
    filter.$or = [
      { orderNumber: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const orders = await Order.find(filter)
    .populate('table')
    .populate('customer')
    .populate('waiter', 'name')
    .populate('session')
    .populate('appliedPromotion')
    .sort('-createdAt');
  res.json(orders);
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id)
    .populate('table')
    .populate('customer')
    .populate('waiter', 'name')
    .populate('session')
    .populate('appliedPromotion');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
};

export const createOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const session = await Session.findOne({ user: req.user._id, isOpen: true });
    const orderNumber = await generateOrderNumber();
    const { subtotal, taxAmount } = calcTotals(req.body.items || []);
    const order = await Order.create({
      ...req.body,
      orderNumber,
      waiter: req.user._id,
      session: session?._id,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    });
    if (req.body.table) {
      await Table.findByIdAndUpdate(req.body.table, { status: 'occupied' });
    }
    const populated = await Order.findById(order._id).populate('table').populate('customer');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    if (order.isPaid) { res.status(400).json({ message: 'Cannot edit a paid order' }); return; }

    if (req.body.items) {
      const { subtotal, taxAmount } = calcTotals(req.body.items);
      req.body.subtotal = subtotal;
      req.body.taxAmount = taxAmount;
      req.body.total = subtotal + taxAmount - (req.body.promotionDiscount || order.promotionDiscount) - (req.body.couponDiscount || order.couponDiscount);
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('table').populate('customer').populate('waiter', 'name').populate('appliedPromotion');
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  const { code, subtotal } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) { res.status(404).json({ message: 'Invalid coupon code' }); return; }
  const discount = coupon.discountType === 'percentage'
    ? (subtotal * coupon.discountValue) / 100
    : coupon.discountValue;
  res.json({ coupon, discount: Math.min(discount, subtotal) });
};

export const applyPromotions = async (req: Request, res: Response): Promise<void> => {
  const { items, subtotal } = req.body;
  const promos = await Promotion.find({ isActive: true });
  let bestDiscount = 0;
  let bestPromo = null;

  for (const promo of promos) {
    let qualifies = false;
    if (promo.type === 'order' && promo.conditionOrderValue && subtotal >= promo.conditionOrderValue) {
      qualifies = true;
    } else if (promo.type === 'product' && promo.conditionProduct && promo.conditionQty) {
      const item = items.find((i: any) => i.product === promo.conditionProduct?.toString());
      if (item && item.quantity >= promo.conditionQty) qualifies = true;
    }
    if (qualifies) {
      const disc = promo.discountType === 'percentage'
        ? (subtotal * promo.discountValue) / 100
        : promo.discountValue;
      if (disc > bestDiscount) { bestDiscount = disc; bestPromo = promo; }
    }
  }
  res.json({ promotion: bestPromo, discount: bestDiscount });
};

export const sendToKitchen = async (req: any, res: Response): Promise<void> => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { kitchenStatus: 'to-cook', status: 'confirmed' },
    { new: true }
  ).populate('table').populate('customer');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  req.io?.emit('kitchen:new-order', order);
  req.io?.emit('order:updated', order);
  res.json(order);
};

export const updateKitchenStatus = async (req: any, res: Response): Promise<void> => {
  const { kitchenStatus } = req.body;
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { kitchenStatus, status: kitchenStatus === 'completed' ? 'ready' : 'preparing' },
    { new: true }
  ).populate('table').populate('customer');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  req.io?.emit('kitchen:status-update', order);
  req.io?.emit('order:updated', order);
  res.json(order);
};

export const updateItemKitchenStatus = async (req: any, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  const item = order.items.find(i => i._id?.toString() === req.params.itemId);
  if (!item) { res.status(404).json({ message: 'Item not found' }); return; }
  item.kitchenCompleted = req.body.kitchenCompleted;
  await order.save();
  req.io?.emit('kitchen:item-update', { orderId: order._id, itemId: req.params.itemId, kitchenCompleted: item.kitchenCompleted });
  res.json(order);
};

export const processPayment = async (req: any, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    if (order.isPaid) { res.status(400).json({ message: 'Order already paid' }); return; }

    const { payments } = req.body;
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
    if (totalPaid < order.total) {
      res.status(400).json({ message: 'Insufficient payment amount' });
      return;
    }

    order.payments = payments;
    order.isPaid = true;
    order.status = 'completed';
    if (order.table) {
      await Table.findByIdAndUpdate(order.table, { status: 'available' });
    }
    await order.save();
    const populated = await Order.findById(order._id).populate('table').populate('customer');
    req.io?.emit('order:paid', populated);
    req.io?.emit('table:status-update', { tableId: order.table, status: 'available' });
    res.json(populated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const cancelOrder = async (req: any, res: Response): Promise<void> => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled' },
    { new: true }
  ).populate('table');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.table) {
    await Table.findByIdAndUpdate(order.table, { status: 'available' });
  }
  req.io?.emit('order:updated', order);
  res.json(order);
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.isPaid) { res.status(400).json({ message: 'Cannot delete a paid order' }); return; }
  await Order.findByIdAndDelete(req.params.id);
  if (order.table) await Table.findByIdAndUpdate(order.table, { status: 'available' });
  res.json({ message: 'Order deleted' });
};
