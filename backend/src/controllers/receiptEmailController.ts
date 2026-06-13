import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import nodemailer from 'nodemailer';

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
    });
  }
  return null;
};

const buildPlainText = (order: any): string => {
  const paymentMethod = order.payments?.[0]?.paymentMethod || '';
  const lines = [
    `CAFE POS — ORDER RECEIPT`,
    `Order: ${order.orderNumber}`,
    `Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`,
    `Type: ${order.orderType.replace('_', ' ')}`,
    order.table ? `Table: ${order.table.tableNumber}` : '',
    order.customer ? `Customer: ${order.customer.name}` : '',
    paymentMethod ? `Payment: ${paymentMethod}` : '',
    ``,
    `ITEMS`,
    ...order.items.map((i: any) => `${i.productName} x${i.quantity}  Rs. ${i.totalPrice.toFixed(2)}`),
    ``,
    `Subtotal: Rs. ${order.subtotal.toFixed(2)}`,
    `Tax:      Rs. ${order.taxAmount.toFixed(2)}`,
    order.discountAmount > 0 ? `Discount: -Rs. ${order.discountAmount.toFixed(2)}` : '',
    `Total:    Rs. ${order.totalAmount.toFixed(2)}`,
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

  const infoRow = (label: string, value: string, green = false) => `
    <tr>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#666666;padding:6px 0;width:45%;">${label}</td>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:bold;color:${green ? '#15803d' : '#111111'};padding:6px 0;text-align:right;">${value}</td>
    </tr>`;

  const itemRows = order.items.map((item: any) => `
    <tr>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#1a1a1a;font-weight:500;padding:10px 0;border-bottom:1px solid #f0f0f0;">${item.productName}</td>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#888888;padding:10px 8px;text-align:center;border-bottom:1px solid #f0f0f0;white-space:nowrap;">x&nbsp;${item.quantity}</td>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:bold;color:#111111;padding:10px 0;text-align:right;border-bottom:1px solid #f0f0f0;white-space:nowrap;">Rs.&nbsp;${item.totalPrice.toFixed(2)}</td>
    </tr>`).join('');

  const totalRow = (label: string, value: string, color = '#555555', size = '14px', topBorder = false) => `
    <tr>
      <td colspan="2" style="font-family:Georgia,'Times New Roman',serif;font-size:${size};color:${color};padding:${topBorder ? '14px 0 5px' : '5px 0'};${topBorder ? 'border-top:2px solid #111111;' : ''}">${label}</td>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:${size};color:${color};font-weight:${topBorder ? 'bold' : 'normal'};padding:${topBorder ? '14px 0 5px' : '5px 0'};text-align:right;${topBorder ? 'border-top:2px solid #111111;' : ''}">Rs.&nbsp;${value}</td>
    </tr>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Receipt ${order.orderNumber}</title>
<style type="text/css">
  body, table, td { margin:0; padding:0; }
  @media only screen and (max-width:600px) {
    .outer { width:100% !important; }
    .header-pad { padding:24px 20px !important; }
    .section-pad { padding:20px 20px !important; }
    .footer-pad { padding:20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f0f0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table border="0" cellpadding="0" cellspacing="0" width="560" class="outer" style="background-color:#ffffff;border:1px solid #d4d4d4;border-radius:4px;overflow:hidden;max-width:560px;">

        <!-- Header -->
        <tr>
          <td class="header-pad" style="background-color:#111111;padding:28px 36px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#888888;margin:0 0 10px;">CAFE POS</p>
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;color:#ffffff;margin:0 0 6px;">Order Receipt</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#aaaaaa;margin:0;letter-spacing:0.5px;">${order.orderNumber}</p>
          </td>
        </tr>

        <!-- Payment confirmed -->
        <tr>
          <td style="background-color:#ffffff;padding:14px 36px;border-bottom:1px solid #e8e8e8;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#dcfce7;border:1px solid #bbf7d0;border-radius:2px;padding:6px 14px;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:8px;"><div style="width:7px;height:7px;background-color:#16a34a;border-radius:50%;display:block;"></div></td>
                      <td style="padding-left:7px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#15803d;">Payment Confirmed</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Order Details -->
        <tr>
          <td class="section-pad" style="padding:22px 36px;border-bottom:1px solid #e8e8e8;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#888888;margin:0 0 14px;">Order Details</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              ${infoRow('Date &amp; Time', new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}
              ${infoRow('Order Type', orderTypeLabel)}
              ${order.table ? infoRow('Table', `Table ${order.table.tableNumber}`) : ''}
              ${order.customer ? infoRow('Customer', order.customer.name) : ''}
              ${paymentMethod ? infoRow('Payment Method', paymentMethod, true) : ''}
            </table>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td class="section-pad" style="padding:22px 36px;border-bottom:1px solid #e8e8e8;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#888888;margin:0 0 14px;">Items Ordered</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <th style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#888888;padding-bottom:10px;border-bottom:1px solid #d4d4d4;text-align:left;">Item</th>
                <th style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#888888;padding-bottom:10px;border-bottom:1px solid #d4d4d4;text-align:center;width:40px;">Qty</th>
                <th style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#888888;padding-bottom:10px;border-bottom:1px solid #d4d4d4;text-align:right;white-space:nowrap;">Amount</th>
              </tr>
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td class="section-pad" style="padding:18px 36px;border-bottom:1px solid #e8e8e8;background-color:#fafafa;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              ${totalRow('Subtotal', order.subtotal.toFixed(2))}
              ${totalRow('Tax', order.taxAmount.toFixed(2))}
              ${order.discountAmount > 0 ? totalRow('Discount Applied', order.discountAmount.toFixed(2), '#15803d') : ''}
              ${totalRow('Total Paid', order.totalAmount.toFixed(2), '#111111', '17px', true)}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="footer-pad" style="padding:22px 36px;background-color:#fafafa;text-align:center;">
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#555555;margin:0 0 4px;">Thank you for dining with us.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaaaaa;margin:0;letter-spacing:0.5px;">Cafe POS &nbsp;&middot;&nbsp; Keep this receipt for your records</p>
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

    const mailOptions: any = {
      from: `Cafe POS <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: `Your order receipt (${order.orderNumber}) - Cafe POS`,
      text,
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
    console.error('[RECEIPT EMAIL ERROR]', err.message, err.code || '');
    const userMessage = err.code === 'EAUTH'
      ? 'Gmail authentication failed — check EMAIL_USER and EMAIL_PASS in .env'
      : err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT'
      ? 'Could not connect to Gmail SMTP — check your internet connection'
      : err.message;
    res.status(500).json({ message: userMessage });
  }
};
