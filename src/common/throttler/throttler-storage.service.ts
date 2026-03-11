import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { Redis } from 'ioredis';

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage {
  private redis: Redis;
  private readonly logger = new Logger(ThrottlerStorageService.name);

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      // Upstash / Railway — ioredis accepts the full URL directly
      this.redis = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: 3,
      });
    } else {
      // Local fallback
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 3,
      });
    }

    this.redis.on('error', (err) => {
      this.logger.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connected');
    });
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    const results = await pipeline.exec();

    if (!results) {
      this.logger.error('Redis pipeline failed');
      throw new Error('Redis pipeline failed');
    }

    return {
      totalHits: results[0][1] as number,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
