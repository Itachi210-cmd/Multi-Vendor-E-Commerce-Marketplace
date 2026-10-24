import {
  checkoutOrder,
  getCustomerOrders,
  getOrderById,
  cancelCustomerOrder,
  getVendorOrders,
  updateVendorSubOrderStatus,
  getAdminOrders,
} from '../services/order.service.js';

export const checkoutHandler = async (req, res, next) => {
  try {
    const { shippingAddress } = req.body;
    const order = await checkoutOrder(req.user._id, shippingAddress);
    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Complete payment to begin fulfillment.',
      order,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        issues: error.issues || [],
      });
    }
    next(error);
  }
};

export const getCustomerOrdersHandler = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await getCustomerOrders(req.user._id, { page, limit });
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByIdHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await getOrderById(id, req.user);
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrderHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await cancelCustomerOrder(id, req.user._id);
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorOrdersHandler = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const data = await getVendorOrders(req.user._id, { status, page, limit });
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendorSubOrderStatusHandler = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Fulfillment status is required',
      });
    }

    const result = await updateVendorSubOrderStatus(req.user._id, orderId, status);
    res.json({
      success: true,
      message: `Sub-order status updated to '${status}'`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrdersHandler = async (req, res, next) => {
  try {
    const { status, paymentStatus, page, limit } = req.query;
    const data = await getAdminOrders({ status, paymentStatus, page, limit });
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};
