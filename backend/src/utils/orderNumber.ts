import Order from '../models/Order';

export async function generateOrderNumber(): Promise<string> {
  const count = await Order.countDocuments();
  return `ORD-${String(count + 1).padStart(4, '0')}`;
}
