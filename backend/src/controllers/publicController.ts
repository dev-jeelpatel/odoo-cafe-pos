import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { generateOrderNumber } from '../utils/orderNumber';

const PHONE_REGEX = /^[6-9]\d{9}$/;

export const getMenu = async (_req: Request, res: Response): Promise<void> => {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { name: 'asc' } }),
  ]);
  res.json({ categories, products });
};

interface OtpEntry {
  code: string;
  expiresAt: number;
  verified: boolean;
}

const otpStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 5 * 60 * 1000;

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  if (!PHONE_REGEX.test(phone || '')) {
    res.status(400).json({ message: 'Enter a valid 10-digit phone number' });
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, verified: false });
  console.log(`[OTP] ${phone} -> ${code}`);
  res.json({ message: 'OTP sent', ...(process.env.NODE_ENV !== 'production' && { otp: code }) });
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { phone, code } = req.body;
  const entry = otpStore.get(phone);
  if (!entry || entry.expiresAt < Date.now()) {
    res.status(400).json({ message: 'OTP expired, please request a new one' });
    return;
  }
  if (entry.code !== code) {
    res.status(400).json({ message: 'Incorrect OTP' });
    return;
  }
  entry.verified = true;
  res.json({ verified: true });
};

const ORDER_INCLUDE = {
  customer: true,
  items: { include: { product: { include: { category: true } } } },
};

export const createOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const { items, type, tableNumber, notes, customerName, customerPhone } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Order must contain at least one item' });
      return;
    }

    if (!PHONE_REGEX.test(customerPhone || '')) {
      res.status(400).json({ message: 'A valid phone number is required' });
      return;
    }

    const otpEntry = otpStore.get(customerPhone);
    if (!otpEntry || !otpEntry.verified || otpEntry.expiresAt < Date.now()) {
      res.status(400).json({ message: 'Please verify your phone number with OTP before placing the order' });
      return;
    }

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true }, include: { category: true } });

    let subtotal = 0;
    let taxAmount = 0;
    const orderItemsData = items.map((i: any) => {
      const product = products.find(p => p.id === i.productId);
      if (!product) throw new Error('One or more items are no longer available');
      const quantity = Math.max(1, Number(i.quantity) || 1);
      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      taxAmount += (lineTotal * product.tax) / 100;
      return {
        productId: product.id,
        productName: product.name,
        categoryColor: product.category?.color || null,
        quantity,
        unitPrice: product.price,
        totalPrice: lineTotal,
        tax: product.tax,
      };
    });

    let customer = await prisma.customer.findFirst({ where: { phone: customerPhone } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: customerName || 'Guest', phone: customerPhone, email: '' } });
    }

    const orderNumber = await generateOrderNumber();
    const orderType = type === 'dine-in' ? 'DINE_IN' : 'TAKEAWAY';
    const orderNotes = tableNumber ? `Table: ${tableNumber}${notes ? ' | ' + notes : ''}` : (notes || '');

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        orderType,
        status: 'CONFIRMED',
        kitchenStatus: 'TO_COOK',
        notes: orderNotes,
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount: subtotal + taxAmount,
        items: { create: orderItemsData },
      },
      include: ORDER_INCLUDE,
    });

    otpStore.delete(customerPhone);

    req.io?.emit('kitchen:new-order', order);
    req.io?.emit('order:updated', order);

    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, orderNumber: true, status: true, kitchenStatus: true, orderType: true,
      subtotal: true, taxAmount: true, totalAmount: true, createdAt: true,
      items: { select: { productName: true, unitPrice: true, quantity: true, totalPrice: true } },
    },
  });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
};
