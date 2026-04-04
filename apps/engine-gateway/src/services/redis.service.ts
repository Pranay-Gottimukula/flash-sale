// apps/engine-gateway/src/services/redis.service.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton — one connection shared across the entire process
const redis = new Redis(REDIS_URL, {
  // Reconnect automatically, with exponential back-off capped at 30 s
  retryStrategy: (times: number) => Math.min(times * 200, 30_000),
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));

export default redis;
