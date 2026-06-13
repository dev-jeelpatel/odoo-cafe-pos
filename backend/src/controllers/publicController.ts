import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import Customer from '../models/Customer';
import Order from '../models/Order';
import { generateOrderNumber } from '../utils/orderNumber';

export const getMenu = async (_req: Request, res: Response): Promise<void> => {
  const [categories, products] = await Promise.all([
    Category.find().sort('name'),
    Product.find({ isAvailable: true }).populate('category').sort('name'),
  ]);
  res.json({ categories, products });
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, type, tableNumber, notes, customerName, customerPhone } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Order must contain at least one item' });
      return;
    }

    const productIds = items.map((i: any) => i.product);
    const products = await Product.find({ _id: { $in: productIds }, isAvailable: true }).populate('category');

    const orderItems = items.map((i: any) => {
      const product = products.find((p: any) => p._id.toString() === i.product);
      if (!product) throw new Error('One or more items are no longer available');
      const quantity = Math.max(1, Number(i.quantity) || 1);
      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        tax: product.tax,
        kitchenCompleted: false,
        categoryColor: (product.category as any)?.color,
      };
    });

    let subtotal = 0;
    let taxAmount = 0;
    orderItems.forEach(item => {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      taxAmount += (lineTotal * item.tax) / 100;
    });

    let customer;
    if (customerPhone) {
      customer = await Customer.findOne({ phone: customerPhone });
      if (!customer) {
        customer = await Customer.create({ name: customerName || 'Guest', phone: customerPhone, email: '' });
      }
    }

    const orderNumber = await generateOrderNumber();
    const order = await Order.create({
      orderNumber,
      customer: customer?._id,
      items: orderItems,
      notes: tableNumber ? `Table: ${tableNumber}${notes ? ' | ' + notes : ''}` : (notes || ''),
      type: type === 'dine-in' ? 'dine-in' : 'takeaway',
      status: 'pending',
      kitchenStatus: 'pending',
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    });

    const populated = await Order.findById(order._id).populate('customer');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id).select(
    'orderNumber status kitchenStatus items subtotal taxAmount total type createdAt'
  );
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
};
