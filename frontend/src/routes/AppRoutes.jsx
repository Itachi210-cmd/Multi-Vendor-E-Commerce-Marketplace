import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import RbacDemoPage from '../pages/RbacDemoPage';
import ProductsPage from '../pages/ProductsPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import BecomeSellerPage from '../pages/BecomeSellerPage';
import VendorLayout from '../pages/vendor/VendorLayout';
import VendorProductsPage from '../pages/vendor/VendorProductsPage';
import VendorProfilePage from '../pages/vendor/VendorProfilePage';
import VendorOrdersPage from '../pages/vendor/VendorOrdersPage';
import VendorApprovalsPage from '../pages/admin/VendorApprovalsPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import MyOrdersPage from '../pages/MyOrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/ProtectedRoute';
import RequireRole from '../components/RequireRole';

export default function AppRoutes() {
  return (
    <Layout>
      <Routes>
        {/* Public Catalog Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rbac-demo" element={<RbacDemoPage />} />

        {/* Customer Cart, Checkout & Orders */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Onboarding */}
        <Route
          path="/become-seller"
          element={
            <ProtectedRoute>
              <BecomeSellerPage />
            </ProtectedRoute>
          }
        />

        {/* Vendor Protected Studio */}
        <Route
          path="/vendor"
          element={
            <RequireRole roles={['vendor']}>
              <VendorLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/vendor/products" replace />} />
          <Route path="products" element={<VendorProductsPage />} />
          <Route path="profile" element={<VendorProfilePage />} />
          <Route path="orders" element={<VendorOrdersPage />} />
        </Route>

        {/* Admin Approvals & Order Management */}
        <Route
          path="/admin/vendors"
          element={
            <RequireRole roles={['admin']}>
              <VendorApprovalsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RequireRole roles={['admin']}>
              <AdminOrdersPage />
            </RequireRole>
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
