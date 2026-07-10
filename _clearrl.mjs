import Redis from "ioredis";
const r = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const keys = await r.keys("ratelimit:login:*");
if (keys.length) await r.del(...keys);
console.log("cleared", keys.length, "keys");
await r.quit();
