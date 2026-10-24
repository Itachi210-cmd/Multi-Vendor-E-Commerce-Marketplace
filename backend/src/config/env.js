import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database and search
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marketplace',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  esNode: process.env.ES_NODE || 'http://127.0.0.1:9200',

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret',

  // Cookie Settings
  cookie: {
    sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  },

  // AWS S3 / MinIO
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_BUCKET || 'marketplace-images',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    publicUrl: process.env.S3_PUBLIC_URL || '',
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // Admin Seed
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@marketplace.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
};
