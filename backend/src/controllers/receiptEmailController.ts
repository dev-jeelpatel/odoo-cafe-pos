import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import nodemailer from 'nodemailer';

const getTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Ethereal test account fallback (logs to console)
  return null;
};

const buildReceiptHtml = (order: any) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><style>
  body{font-family:Arial,sans-serif;background:#f9f9f9;color:#333;margin:0;padding:0}
  .receipt{max-width:520px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:28px 32px;text-align:center}
  .header h1{margin:0;font-size:22px}
  .header p{margin:4px 0 0;opacity:.85;font-size:13px}
  .body{padding:28px 32px}
  .info-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px}
  .info-row span:first-child{color:#64748b}
  .divider{border:none;border-top:1px dashed #e2e8f0;margin:18px 0}
  .item{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #f1f5f9}
  .item-name{flex:1}
  .item-qty{color:#64748b;margin:0 16px}
  .item-price{font-weight:600}
  .totals{margin-top:16px}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;color:#475569}
  .total-row.grand{font-size:18px;font-weight:700;color:#1e293b;padding-top:12px;border-top:2px solid #6366f1;margin-top:8px}
  .footer{background:#f8fafc;padding:18px 32px;text-align:center;font-size:12px;color:#94a3b8}
  .paid-badge{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 14px;border-radius:999px;font-weight:700;font-size:12px;margin-top:6px}
</style></head>
<body>
<div class="receipt">
  <div class="header">
    <h1>☕ Cafe POS</h1>
    <p>Receipt — ${order.orderNumber}</p>
  </div>
  <div class="body">
    <div class="info-row"><span>Date</span><span>${new Date(order.createdAt).toLocaleString()}</span></div>
    <div class="info-row"><span>Order Type</span><span>${order.orderType.replace('_', ' ')}</span></div>
    ${order.table ? `<div class="info-row"><span>Table</span><span>T${order.table.tableNumber}</span></div>` : ''}
    ${order.customer ? `<div class="info-row"><span>Customer</span><span>${order.customer.name}</span></div>` : ''}
    ${order.payments?.[0] ? `<div class="info-row"><span>Payment</span><span>${order.payments[0].paymentMethod}</span></div>` : ''}
    <hr class="divider"/>
    <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase">Items</div>
    ${order.items.map((item: any) => `
      <div class="item">
        <span class="item-name">${item.productName}</span>
        <span class="item-qty">×${item.quantity}</span>
        <span class="item-price">₹${item.totalPrice.toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>₹${order.subtotal.toFixed(2)}</span></div>
      <div class="total-row"><span>Tax</span><span>₹${order.taxAmount.toFixed(2)}</span></div>
      ${order.discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span>-₹${order.discountAmount.toFixed(2)}</span></div>` : ''}
      <div class="total-row grand"><span>Total</span><span>₹${order.totalAmount.toFixed(2)}</span></div>
    </div>
    <div style="text-align:center;margin-top:16px"><span class="paid-badge">✓ PAID</span></div>
  </div>
  <div class="footer">Thank you for dining with us! · Cafe POS</div>
</div>
</body>
</html>`;

export const getCompletedOrders = async (_req: Request, res: Response): Promise<void> => {
  const orders = await prisma.order.findMany({
    where: { isPaid: true },
    include: { customer: true, table: true, items: true, payments: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(orders);
};

export const sendReceiptEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { email, pdfBase64 } = req.body;
    if (!email) { res.status(400).json({ message: 'Email is required' }); return; }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, table: true, items: true, payments: true },
    });
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }

    const html = buildReceiptHtml(order);
    const transporter = getTransporter();

    if (!transporter) {
      console.log(`[RECEIPT EMAIL] Would send receipt for ${order.orderNumber} to ${email}`);
      console.log(html);
      res.json({ success: true, message: `Receipt logged (SMTP not configured). Configure SMTP_HOST in .env to send real emails.` });
      return;
    }

    const mailOptions: any = {
      from: process.env.SMTP_FROM || 'Cafe POS <noreply@cafe.com>',
      to: email,
      subject: `Your Receipt — ${order.orderNumber}`,
      html,
    };

    if (pdfBase64) {
      mailOptions.attachments = [{
        filename: `receipt-${order.orderNumber}.pdf`,
        content: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
        encoding: 'base64',
        contentType: 'application/pdf',
      }];
    }

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Receipt sent to ${email}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
