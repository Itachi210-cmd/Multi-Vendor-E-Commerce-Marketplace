import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState({
    items: [],
    subtotal: 0,
    totalItems: 0,
    hasIssues: false,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'customer') {
      setCart({ items: [], subtotal: 0, totalItems: 0, hasIssues: false });
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/cart');
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
    } catch (err) {
      // Don't show toast for silent initial fetch
      console.warn('[Cart] Fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, qty = 1) => {
    if (!isAuthenticated) {
      showToast('Please sign in to add items to your cart', 'error');
      return { success: false, requireAuth: true };
    }

    if (user?.role !== 'customer') {
      showToast('Only customer accounts can use the shopping cart', 'error');
      return { success: false };
    }

    try {
      setLoading(true);
      const res = await api.post('/cart/items', { productId, qty });
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
      showToast('Added to cart!', 'success');
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to add item to cart';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, qty) => {
    try {
      setLoading(true);
      const res = await api.patch(`/cart/items/${productId}`, { qty });
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
      if (qty <= 0) {
        showToast('Item removed from cart', 'success');
      }
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to update quantity';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    try {
      setLoading(true);
      const res = await api.delete(`/cart/items/${productId}`);
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
      showToast('Item removed', 'success');
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to remove item';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      const res = await api.delete('/cart');
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
      showToast('Cart cleared', 'success');
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to clear cart';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart.items,
        subtotal: cart.subtotal,
        totalItems: cart.totalItems,
        hasIssues: cart.hasIssues,
        loading,
        toast,
        showToast,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
      {/* Global Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`} role="status">
          <span className="toast-icon">
            {toast.type === 'success' ? '✓' : '⚠️'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default useCart;
