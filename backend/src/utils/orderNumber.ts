import prisma from '../lib/prisma';

export async function generateOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  return `ORD-${String(count + 1).padStart(5, '0')}`;
}

export async function generateReceiptNumber(): Promise<string> {
  const count = await prisma.receipt.count();
  return `RCP-${String(count + 1).padStart(5, '0')}`;
}
