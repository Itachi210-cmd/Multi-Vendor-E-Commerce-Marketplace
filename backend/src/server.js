import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { ensureIndex } from './services/search.service.js';

/**
 * Bootstrap and start Express HTTP server
 */
const startServer = async () => {
  try {
    // Attempt connections to backing services
    await connectDB();
    await connectRedis();

    // Ensure Elasticsearch index exists (non-blocking)
    ensureIndex().catch((err) => {
      console.warn(`[Elasticsearch] Notice: Index initialization deferred (${err.message}).`);
    });

    const server = app.listen(env.port, () => {
      console.log('----------------------------------------------------');
      console.log(`[Backend] Server listening on port ${env.port} (${env.nodeEnv})`);
      console.log(`[Backend] Allowed CORS origin: ${env.clientUrl}`);
      console.log(`[Backend] Health check: http://localhost:${env.port}/api/health`);
      console.log('----------------------------------------------------');
    });

    // Graceful shutdown handling
    const shutdown = (signal) => {
      console.log(`\n[Backend] ${signal} signal received. Closing HTTP server...`);
      server.close(() => {
        console.log('[Backend] HTTP server closed gracefully.');
        process.exit(0);
      });

      // Force close if graceful close hangs
      setTimeout(() => {
        console.error('[Backend] Forcing shutdown after timeout.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(`[Backend] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
