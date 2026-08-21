import { createClient } from "redis";

const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (error) => {
    console.error("Redis Client Error", error);
}
);

async function startWorker() {
  await redis.connect();

  console.log("Worker connected to Redis");
  console.log("Waiting for jobs...");

  while (true) {
    const result = await redis.brPop("coffee-jobs", 0);

    if (!result) continue;

    const job = JSON.parse(result.element);

    console.log("Job received:", job);

    // Abhi sirf job process/test kar rahe hain
    console.log("Job processed successfully");
  }
}

startWorker().catch((error) => {
  console.error("Worker error:", error);
});