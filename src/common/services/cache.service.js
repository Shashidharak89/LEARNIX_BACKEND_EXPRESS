import redisClient from "../../config/redis.js";

export class CacheService {
  /**
   * Get parsed JSON value from Redis by key.
   */
  static async get(key) {
    if (!redisClient || redisClient.status !== "ready") {
      return null;
    }

    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.warn(`[CacheService] Failed to read key "${key}":`, err.message);
      return null;
    }
  }

  /**
   * Set JSON value in Redis with TTL in seconds.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - Duration in seconds (e.g. 1800 for 30 minutes)
   */
  static async set(key, value, ttlSeconds = 1800) {
    if (!redisClient || redisClient.status !== "ready") {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redisClient.set(key, serialized, "EX", ttlSeconds);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (err) {
      console.warn(`[CacheService] Failed to write key "${key}":`, err.message);
      return false;
    }
  }

  /**
   * Delete key from Redis.
   */
  static async del(key) {
    if (!redisClient || redisClient.status !== "ready") {
      return false;
    }

    try {
      await redisClient.del(key);
      return true;
    } catch (err) {
      console.warn(`[CacheService] Failed to delete key "${key}":`, err.message);
      return false;
    }
  }
}
