import Redis from "ioredis";
import { env } from "./env.js";

let redisClient = null;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("[Redis] Maximum reconnect attempts reached. Falling back to DB.");
          return null; // Stop reconnecting after 3 attempts
        }
        return Math.min(times * 200, 2000);
      },
    });
    redisClient.on("connect", () => {
      console.log("[Redis] Connected to Redis server");
    });

    redisClient.on("ready", () => {
      console.log("[Redis] Redis client ready");
    });

    redisClient.on("error", (err) => {
      console.error("[Redis Error]:", err.message);
    });
  } catch (err) {
    console.error("[Redis Initialization Error]:", err.message);
    redisClient = null;
  }
} else {
  console.warn("[Redis Warning]: REDIS_URL not configured. Cache will be bypassed.");
}

export default redisClient;
