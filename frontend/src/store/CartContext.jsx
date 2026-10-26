import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import api, { registerLogoutListener } from '../api/axios';
import useAuth from '../hooks/useAuth';

const CartContext = createContext(null);

const INITIAL_CART_STATE = {
  items: [],
  subtotal: 0,
  totalItems: 0,
  hasIssues: false,
};

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState(INITIAL_CART_STATE);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const toastTimeoutRef = useRef(null);
  const prevUserIdRef = useRef(user?._id);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(null);
  }, []);

  const resetCartState = useCallback(() => {
    setCart(INITIAL_CART_STATE);
    clearToast();
    setLoading(false);
  }, [clearToast]);

  // Reset cart immediately on logout
  useEffect(() => {
    const unregister = registerLogoutListener(() => {
      resetCartState();
    });
    return () => {
      unregister();
    };
  }, [resetCartState]);

  const fetchCart = useCallback(async () => {
    // Only customer accounts fetch cart. Vendors and admins make zero cart calls.
    if (!isAuthenticated || user?.role !== 'customer') {
      setCart(INITIAL_CART_STATE);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/cart');
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
    } catch (err) {
      if (!err?.isCanceled) {
        console.warn('[Cart] Fetch failed:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  // When the logged-in user id changes without a page reload, reset and refetch
  useEffect(() => {
    if (prevUserIdRef.current !== user?._id) {
      prevUserIdRef.current = user?._id;
      resetCartState();
    }

    if (isAuthenticated && user?.role === 'customer') {
      fetchCart();
    } else {
      setCart(INITIAL_CART_STATE);
    }
  }, [user?._id, user?.role, isAuthenticated, resetCartState, fetchCart]);

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
      if (err?.isCanceled) return { success: false };
      const errMsg = err.response?.data?.message || err.message || 'Failed to add item to cart';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, qty) => {
    if (!isAuthenticated || user?.role !== 'customer') return { success: false };
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
      if (err?.isCanceled) return { success: false };
      const errMsg = err.response?.data?.message || err.message || 'Failed to update quantity';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    if (!isAuthenticated || user?.role !== 'customer') return { success: false };
    try {
      setLoading(true);
      const res = await api.delete(`/cart/items/${productId}`);
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
      showToast('Item removed', 'success');
      return { success: true };
    } catch (err) {
      if (err?.isCanceled) return { success: false };
      const errMsg = err.response?.data?.message || err.message || 'Failed to remove item';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated || user?.role !== 'customer') return { success: false };
    try {
      setLoading(true);
      const res = await api.delete('/cart');
      if (res.data?.cart) {
        setCart(res.data.cart);
      }
      showToast('Cart cleared', 'success');
      return { success: true };
    } catch (err) {
      if (err?.isCanceled) return { success: false };
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
        clearToast,
        resetCartState,
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
