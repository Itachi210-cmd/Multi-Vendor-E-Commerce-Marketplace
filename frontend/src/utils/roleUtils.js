/**
 * Role and route authorization helpers
 */

export const getRoleHome = (role) => {
  switch (role) {
    case 'vendor':
      return '/vendor/products';
    case 'admin':
      return '/admin/analytics';
    case 'customer':
    default:
      return '/';
  }
};

export const isRouteAllowedForRole = (pathname, role) => {
  if (!pathname || typeof pathname !== 'string') return false;

  // Clean pathname from query params and hash
  const path = pathname.split('?')[0].split('#')[0];

  // Disallow redirecting back to login or register
  if (path === '/login' || path === '/register') return false;

  // Customer-only routes
  const isCustomerRoute =
    path === '/cart' ||
    path === '/checkout' ||
    path === '/orders' ||
    path === '/become-seller';

  // Vendor-only routes
  const isVendorRoute = path === '/vendor' || path.startsWith('/vendor/');

  // Admin-only routes
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');

  // Order detail can be opened by customer owner OR admin
  if (path.startsWith('/orders/')) {
    return role === 'customer' || role === 'admin';
  }

  if (isCustomerRoute) {
    return role === 'customer';
  }

  if (isVendorRoute) {
    return role === 'vendor';
  }

  if (isAdminRoute) {
    return role === 'admin';
  }

  // Public routes (/, /products, /products/:id, /rbac-demo) allowed for all
  return true;
};
