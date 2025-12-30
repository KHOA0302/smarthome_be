const Redis = require("ioredis");

const redisClient = new Redis({
  port: 6379,
  host: "127.0.0.1",
});

redisClient.on("connect", () => {
  console.log("Redis is CONNECTED.");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = redisClient;
