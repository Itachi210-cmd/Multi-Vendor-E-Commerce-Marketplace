import PDFDocument from 'pdfkit';
import Order from '../models/order.model.js';

/**
 * Format currency in INR
 */
const formatINR = (val) => {
  const num = Number(val) || 0;
  return `INR ${num.toFixed(2)}`;
};

/**
 * Generate and stream PDF invoice for an order
 * @param {string} orderId
 * @param {Object} user - Authenticated user
 * @param {Object} res - Express response stream
 */
export const streamInvoicePDF = async (orderId, user, res) => {
  const order = await Order.findById(orderId)
    .populate('customerId', 'name email')
    .populate('subOrders.vendorId', 'storeName');

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Access control: order owner or admin
  const isOwner = order.customerId._id.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden: You do not have permission to view this invoice');
    err.statusCode = 403;
    throw err;
  }

  // Only paid orders can have an invoice generated
  if (order.payment.status !== 'paid') {
    const err = new Error('Invoice is only available for paid orders');
    err.statusCode = 400;
    throw err;
  }

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    bufferPages: true,
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="invoice-${order.orderNumber}.pdf"`
  );

  doc.pipe(res);

  // Platform Header
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('MULTI-VENDOR MARKETPLACE', 50, 50);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Official Tax Invoice / Purchase Receipt', 50, 78);

  // Divider
  doc
    .strokeColor('#cbd5e1')
    .lineWidth(1)
    .moveTo(50, 95)
    .lineTo(545, 95)
    .stroke();

  // Invoice & Order Metadata (2 columns)
  const metaY = 110;
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#334155')
    .text('INVOICE DETAILS', 50, metaY);

  doc
    .font('Helvetica')
    .fillColor('#475569')
    .text(`Invoice No: INV-${order.orderNumber}`, 50, metaY + 16)
    .text(`Order Number: ${order.orderNumber}`, 50, metaY + 30)
    .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, metaY + 44)
    .text(`Payment Status: ${order.payment.status.toUpperCase()}`, 50, metaY + 58)
    .text(`Payment Method: ${order.payment.method ? order.payment.method.toUpperCase() : 'ONLINE'}`, 50, metaY + 72)
    .text(`Payment ID: ${order.payment.providerPaymentId || 'N/A'}`, 50, metaY + 86);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#334155')
    .text('BILLED / SHIPPED TO', 320, metaY);

  const addr = order.shippingAddress;
  const customerName = order.customerId?.name || addr.name || 'Customer';

  doc
    .font('Helvetica')
    .fillColor('#475569')
    .text(customerName, 320, metaY + 16)
    .text(addr.line1, 320, metaY + 30);

  let currentAddrY = metaY + 44;
  if (addr.line2) {
    doc.text(addr.line2, 320, currentAddrY);
    currentAddrY += 14;
  }
  doc.text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 320, currentAddrY);
  currentAddrY += 14;
  doc.text(`Phone: ${addr.phone}`, 320, currentAddrY);

  // Items Table Header
  let tableY = Math.max(metaY + 115, currentAddrY + 25);

  const drawTableHeader = (y) => {
    doc
      .rect(50, y, 495, 22)
      .fill('#f1f5f9');

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#1e293b')
      .text('ITEM DESCRIPTION', 60, y + 6)
      .text('QTY', 330, y + 6, { width: 40, align: 'center' })
      .text('UNIT PRICE', 380, y + 6, { width: 75, align: 'right' })
      .text('TOTAL', 465, y + 6, { width: 70, align: 'right' });

    return y + 25;
  };

  tableY = drawTableHeader(tableY);

  // Loop through subOrders grouped by vendor
  for (const subOrder of order.subOrders) {
    const vendorName = subOrder.vendorId?.storeName || 'Vendor';

    // Check page break
    if (tableY > 700) {
      doc.addPage();
      tableY = drawTableHeader(50);
    }

    // Vendor header row
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text(`Store: ${vendorName}`, 55, tableY + 4);

    tableY += 18;

    for (const item of subOrder.items) {
      if (tableY > 720) {
        doc.addPage();
        tableY = drawTableHeader(50);
      }

      const itemTotal = Number((item.price * item.qty).toFixed(2));

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(item.title, 65, tableY, { width: 255, lineBreak: false, ellipsis: true })
        .text(item.qty.toString(), 330, tableY, { width: 40, align: 'center' })
        .text(formatINR(item.price), 380, tableY, { width: 75, align: 'right' })
        .text(formatINR(itemTotal), 465, tableY, { width: 70, align: 'right' });

      tableY += 18;
    }

    // Subtotal per vendor
    doc
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor('#64748b')
      .text(
        `Subtotal for ${vendorName} (discounted): ${formatINR(subOrder.subtotal)}`,
        300,
        tableY,
        { width: 235, align: 'right' }
      );

    tableY += 18;

    doc
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .moveTo(50, tableY)
      .lineTo(545, tableY)
      .stroke();

    tableY += 8;
  }

  // Summary / Totals block
  if (tableY > 680) {
    doc.addPage();
    tableY = 50;
  }

  tableY += 15;
  const summaryX = 320;
  const summaryValX = 460;
  const summaryW = 75;

  // Calculate gross total of items before discount
  const grossItemsTotal = order.items.reduce(
    (sum, it) => sum + it.price * it.qty,
    0
  );

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#475569')
    .text('Items Subtotal:', summaryX, tableY)
    .text(formatINR(grossItemsTotal), summaryValX, tableY, { width: summaryW, align: 'right' });

  tableY += 16;

  if (order.discount && order.discount > 0) {
    const couponLabel = order.couponCode ? `Discount (${order.couponCode}):` : 'Discount:';
    doc
      .fillColor('#16a34a')
      .text(couponLabel, summaryX, tableY)
      .text(`- ${formatINR(order.discount)}`, summaryValX, tableY, { width: summaryW, align: 'right' });

    tableY += 16;
  }

  // Grand Total Box
  doc
    .rect(summaryX - 10, tableY, 235, 26)
    .fill('#f8fafc');

  doc
    .strokeColor('#cbd5e1')
    .lineWidth(1)
    .rect(summaryX - 10, tableY, 235, 26)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f172a')
    .text('Grand Total:', summaryX, tableY + 8)
    .text(formatINR(order.total), summaryValX, tableY + 8, { width: summaryW, align: 'right' });

  tableY += 50;

  // Footer Note
  if (tableY > 740) {
    doc.addPage();
    tableY = 50;
  }

  doc
    .strokeColor('#e2e8f0')
    .lineWidth(1)
    .moveTo(50, tableY)
    .lineTo(545, tableY)
    .stroke();

  doc
    .fontSize(8.5)
    .font('Helvetica')
    .fillColor('#94a3b8')
    .text(
      'Thank you for shopping with us! This computer-generated invoice is valid without a physical signature.',
      50,
      tableY + 12,
      { align: 'center', width: 495 }
    )
    .text(
      'For customer support or queries regarding your order, please contact support@marketplace.local',
      50,
      tableY + 26,
      { align: 'center', width: 495 }
    );

  doc.end();
};

export const invoiceService = {
  streamInvoicePDF,
};

export default invoiceService;
