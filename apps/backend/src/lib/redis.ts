import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// One Redis connection is shared by cache, queue, and health-check code.
// The short retry policy makes infrastructure failures surface quickly in APIs.
export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  connectTimeout: 1_000,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    return Math.min(times * 100, 1_000);
  },
});

// Redis emits connection errors during outages; health checks report the failure.
// This listener prevents expected infrastructure errors from crashing the process.
redis.on("error", () => {});
