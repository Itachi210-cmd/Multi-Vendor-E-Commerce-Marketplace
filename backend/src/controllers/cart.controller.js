import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../services/cart.service.js';

export const getCartHandler = async (req, res, next) => {
  try {
    const cart = await getCart(req.user._id);
    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCartHandler = async (req, res, next) => {
  try {
    const { productId, qty = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required',
      });
    }

    const cart = await addToCart(req.user._id, productId, qty);
    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItemHandler = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { qty } = req.body;

    if (qty === undefined || qty === null) {
      return res.status(400).json({
        success: false,
        message: 'qty is required',
      });
    }

    const cart = await updateCartItem(req.user._id, productId, qty);
    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromCartHandler = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await removeFromCart(req.user._id, productId);
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCartHandler = async (req, res, next) => {
  try {
    const cart = await clearCart(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart,
    });
  } catch (error) {
    next(error);
  }
};
