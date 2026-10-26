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
import VendorEarningsPage from '../pages/vendor/VendorEarningsPage';
import VendorApprovalsPage from '../pages/admin/VendorApprovalsPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminPayoutsPage from '../pages/admin/AdminPayoutsPage';
import AdminCouponsPage from '../pages/admin/AdminCouponsPage';
import AdminAnalyticsPage from '../pages/admin/AdminAnalyticsPage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import MyOrdersPage from '../pages/MyOrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import NotFoundPage from '../pages/NotFoundPage';
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

        {/* Customer-only Cart, Checkout & Orders */}
        <Route
          path="/cart"
          element={
            <RequireRole roles={['customer']}>
              <CartPage />
            </RequireRole>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireRole roles={['customer']}>
              <CheckoutPage />
            </RequireRole>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireRole roles={['customer']}>
              <MyOrdersPage />
            </RequireRole>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <RequireRole roles={['customer', 'admin']}>
              <OrderDetailPage />
            </RequireRole>
          }
        />

        {/* Customer-only Onboarding */}
        <Route
          path="/become-seller"
          element={
            <RequireRole roles={['customer']}>
              <BecomeSellerPage />
            </RequireRole>
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
          <Route path="earnings" element={<VendorEarningsPage />} />
        </Route>

        {/* Admin Approvals, Orders & Payout Management */}
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
        <Route
          path="/admin/payouts"
          element={
            <RequireRole roles={['admin']}>
              <AdminPayoutsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <RequireRole roles={['admin']}>
              <AdminCouponsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RequireRole roles={['admin']}>
              <AdminAnalyticsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={<Navigate to="/admin/analytics" replace />}
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
