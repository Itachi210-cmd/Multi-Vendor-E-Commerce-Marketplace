import { streamInvoicePDF } from '../services/invoice.service.js';

export const getOrderInvoiceHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    await streamInvoicePDF(id, req.user, res);
  } catch (error) {
    next(error);
  }
};
