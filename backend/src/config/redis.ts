// src/config/redis.ts
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('[Redis Alert] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing from environment.');
}

export const redis = new Redis({
  url: redisUrl || '',
  token: redisToken || '',
});
