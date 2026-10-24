import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import adminVendorRoutes from './routes/admin.vendor.routes.js';
import productRoutes from './routes/product.routes.js';
import vendorProductRoutes from './routes/vendor.product.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import vendorOrderRoutes from './routes/vendor.order.routes.js';
import adminOrderRoutes from './routes/admin.order.routes.js';
import devRoutes from './routes/dev.routes.js';

const app = express();

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matched clientUrl
      if (!origin || origin === env.clientUrl) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// HTTP request logger
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Cookie parser (required for httpOnly refresh tokens)
app.use(cookieParser());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to general API routes
app.use('/api', apiRateLimiter);

// Route mounts
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/admin/vendors', adminVendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendor/products', vendorProductRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendor/orders', vendorOrderRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/dev', devRoutes);

// 404 & Global Error Handler
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
