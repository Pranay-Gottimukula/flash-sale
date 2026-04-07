// apps/engine-gateway/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import prisma from './lib/prisma';
import redis from './services/redis.service';
import queueRoutes from './routes/queue.routes';
import adminRoutes from './routes/admin.routes';
import healthRouter from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
// app.use('/api/queue', queueRoutes);
// app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
// app.get('/health', async (_req, res) => {
//   try {
//     // 1. Check Postgres
//     await prisma.$queryRaw`SELECT 1`;

//     // 2. Check Redis (Sends a PING, expects a PONG)
//     await redis.ping();

//     // 3. Both passed! Return a detailed success map
//     res.json({ 
//       status: 'ok',
//       message: 'Engine Gateway is ALIVE!',
//       services: {
//         postgres: 'connected',
//         redis: 'connected'
//       }
//     });

//   } catch (error) {
//     console.error('🚨 Health Check Failed:', error);
    
//     // If either DB fails, the whole gateway is considered degraded
//     res.status(500).json({ 
//       status: 'error', 
//       message: 'A critical backend service is down.',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

app.use('/health', healthRouter);

app.listen(PORT, () => {
  console.log(`🚀 Engine Gateway running on http://localhost:${PORT}`);
});

// redis.connect().catch((err) => {
//   // We catch the initial error so Node doesn't throw an Unhandled Promise Rejection.
//   // ioredis will automatically take over and use our retryStrategy to keep trying!
//   console.warn('⚠️ Redis is currently unreachable. Gateway is alive, but queue is paused. Retrying...');
// });