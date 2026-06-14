import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const getTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s/g, ''),
      },
      tls: { rejectUnauthorized: false },
    });
  }
  return null;
};

const buildPlainText = (order: any): string => {
  const paymentMethod = order.payments?.[0]?.paymentMethod || '';
  const lines = [
    `ORDER RECEIPT — CAFE POS`,
    `================================`,
    `Order No : ${order.orderNumber}`,
    `Date     : ${new Date(order.createdAt).toLocaleString('en-IN')}`,
    `Type     : ${order.orderType.replace('_', ' ')}`,
    order.table ? `Table    : Table ${order.table.tableNumber}` : '',
    order.customer ? `Customer : ${order.customer.name}` : '',
    paymentMethod ? `Payment  : ${paymentMethod}` : '',
    ``,
    `ITEMS`,
    `--------------------------------`,
    ...order.items.map((i: any) => `${i.productName} x${i.quantity}  Rs. ${Number(i.totalPrice).toFixed(2)}`),
    ``,
    `--------------------------------`,
    `Subtotal : Rs. ${Number(order.subtotal).toFixed(2)}`,
    `Tax      : Rs. ${Number(order.taxAmount).toFixed(2)}`,
    order.discountAmount > 0 ? `Discount : -Rs. ${Number(order.discountAmount).toFixed(2)}` : '',
    `TOTAL    : Rs. ${Number(order.totalAmount).toFixed(2)}`,
    `================================`,
    ``,
    `Thank you for dining with us.`,
    `Cafe POS`,
  ].filter(Boolean);
  return lines.join('\n');
};

const buildReceiptHtml = (order: any): string => {
  const paymentMethod = order.payments?.[0]?.paymentMethod
    ? order.payments[0].paymentMethod.charAt(0) + order.payments[0].paymentMethod.slice(1).toLowerCase()
    : null;

  const orderTypeLabel = order.orderType
    .replace('_', ' ')
    .split(' ')
    .map((w: string) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

  const row = (label: string, value: string) => `
    <tr>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;padding:5px 0;width:45%;">${label}</td>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111111;font-weight:600;padding:5px 0;text-align:right;">${value}</td>
    </tr>`;

  const itemRows = order.items.map((item: any) => `
    <tr>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222222;padding:8px 0;border-bottom:1px solid #f0f0f0;">${item.productName}</td>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#777777;padding:8px 6px;text-align:center;border-bottom:1px solid #f0f0f0;white-space:nowrap;">x${item.quantity}</td>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#111111;padding:8px 0;text-align:right;border-bottom:1px solid #f0f0f0;white-space:nowrap;">Rs.&nbsp;${Number(item.totalPrice).toFixed(2)}</td>
    </tr>`).join('');

  const totalRow = (label: string, value: string, bold = false, topLine = false) => `
    <tr>
      <td colspan="2" style="font-family:Arial,Helvetica,sans-serif;font-size:${bold ? '14px' : '13px'};color:${bold ? '#111111' : '#555555'};padding:${topLine ? '10px 0 4px' : '4px 0'};${topLine ? 'border-top:2px solid #222222;' : ''}${bold ? 'font-weight:700;' : ''}">${label}</td>
      <td style="font-family:Arial,Helvetica,sans-serif;font-size:${bold ? '14px' : '13px'};color:${bold ? '#111111' : '#555555'};padding:${topLine ? '10px 0 4px' : '4px 0'};text-align:right;${topLine ? 'border-top:2px solid #222222;' : ''}${bold ? 'font-weight:700;' : ''}">Rs.&nbsp;${value}</td>
    </tr>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Receipt ${order.orderNumber} — Cafe POS</title>
<style type="text/css">
  body,table,td,p{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;}
  @media only screen and (max-width:600px){
    .wrap{width:100%!important;}
    .pad{padding:20px 16px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f5;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table border="0" cellpadding="0" cellspacing="0" width="540" class="wrap" style="background-color:#ffffff;border:1px solid #dddddd;max-width:540px;">

        <!-- Header -->
        <tr>
          <td class="pad" style="padding:28px 36px;border-bottom:2px solid #222222;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;margin:0 0 6px;">CAFE POS</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#111111;margin:0;">Order Receipt</p>
                </td>
                <td align="right" valign="top">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;margin:0 0 4px;">Order No.</p>
                  <p style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#333333;margin:0;">${order.orderNumber}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Status line -->
        <tr>
          <td style="padding:12px 36px;background-color:#f9f9f9;border-bottom:1px solid #eeeeee;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:8px;"><div style="width:8px;height:8px;background-color:#2e7d32;border-radius:50%;display:block;"></div></td>
                <td style="padding-left:8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:#2e7d32;letter-spacing:0.5px;">PAYMENT RECEIVED</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Order Details -->
        <tr>
          <td class="pad" style="padding:22px 36px;border-bottom:1px solid #eeeeee;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888888;margin:0 0 12px;">Order Details</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              ${row('Date &amp; Time', new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}
              ${row('Order Type', orderTypeLabel)}
              ${order.table ? row('Table', `Table ${order.table.tableNumber}`) : ''}
              ${order.customer ? row('Customer', order.customer.name) : ''}
              ${paymentMethod ? row('Payment Method', paymentMethod) : ''}
            </table>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td class="pad" style="padding:22px 36px;border-bottom:1px solid #eeeeee;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888888;margin:0 0 12px;">Items Ordered</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <th style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999999;padding-bottom:8px;border-bottom:1px solid #cccccc;text-align:left;">Item</th>
                <th style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999999;padding-bottom:8px;border-bottom:1px solid #cccccc;text-align:center;width:36px;">Qty</th>
                <th style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999999;padding-bottom:8px;border-bottom:1px solid #cccccc;text-align:right;white-space:nowrap;">Amount</th>
              </tr>
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td class="pad" style="padding:18px 36px;border-bottom:1px solid #eeeeee;background-color:#f9f9f9;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              ${totalRow('Subtotal', Number(order.subtotal).toFixed(2))}
              ${totalRow('Tax', Number(order.taxAmount).toFixed(2))}
              ${order.discountAmount > 0 ? totalRow('Discount', '-' + Number(order.discountAmount).toFixed(2)) : ''}
              ${totalRow('Total Paid', Number(order.totalAmount).toFixed(2), true, true)}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="pad" style="padding:20px 36px;text-align:center;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#444444;margin:0 0 6px;">Thank you for dining with us.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaaaaa;margin:0;">Cafe POS &nbsp;&bull;&nbsp; This is your official receipt. Please retain for your records.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

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
    const text = buildPlainText(order);
    const transporter = getTransporter();

    if (!transporter) {
      console.log(`[RECEIPT EMAIL] Would send receipt for ${order.orderNumber} to ${email}`);
      res.json({ success: true, message: `Receipt logged (EMAIL_USER/EMAIL_PASS not configured in .env).` });
      return;
    }

    const uniqueId = crypto.randomBytes(12).toString('hex');
    const domain = process.env.EMAIL_USER?.split('@')[1] || 'gmail.com';

    const mailOptions: any = {
      from: `Cafe POS <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: `Receipt for your order #${order.orderNumber} — Cafe POS`,
      text,
      html,
      messageId: `<${uniqueId}.${order.orderNumber}@${domain}>`,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Cafe POS Mailer',
        'Precedence': 'bulk',
      },
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
    console.log(`[RECEIPT EMAIL] Sent receipt ${order.orderNumber} to ${email}`);
    res.json({ success: true, message: `Receipt sent to ${email}` });
  } catch (err: any) {
    console.error('[RECEIPT EMAIL ERROR]', err.message, err.code || '');
    const userMessage = err.code === 'EAUTH'
      ? 'Gmail authentication failed — check EMAIL_USER and EMAIL_PASS in .env'
      : err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT'
      ? 'Could not connect to Gmail SMTP — check your internet connection'
      : err.message;
    res.status(500).json({ message: userMessage });
  }
};
