const path = require("node:path");

const serverRuntimeEnv = {};

if (process.env.TIKHUB_API_KEY) {
  serverRuntimeEnv.TIKHUB_API_KEY = process.env.TIKHUB_API_KEY;
}

module.exports = {
  apps: [
    {
      name: "ai-omni-server",
      cwd: __dirname,
      script: "npm",
      args: "--workspace apps/server run start",
      env: {
        NODE_ENV: "production",
        PORT: "3011",
        SERVER_HOST: "127.0.0.1",
        SERVER_BOOT_MODE: "api",
        ENABLE_RUNTIME_DEBUG: process.env.ENABLE_RUNTIME_DEBUG || "false",
        WORKS_HEAVY_RECOVERY_POLLING_ENABLED: "false",
        WORKS_HEAVY_SUBMISSION_WORKER_ENABLED: process.env.WORKS_HEAVY_SUBMISSION_WORKER_ENABLED || "true",
        ...serverRuntimeEnv,
      },
    },
    {
      name: "ai-omni-server-worker",
      cwd: __dirname,
      script: "npm",
      args: "--workspace apps/server run start",
      env: {
        NODE_ENV: "production",
        SERVER_BOOT_MODE: "worker",
        ENABLE_RUNTIME_DEBUG: process.env.ENABLE_RUNTIME_DEBUG || "false",
        WORKS_HEAVY_RECOVERY_POLLING_ENABLED: process.env.WORKS_HEAVY_RECOVERY_POLLING_ENABLED || "true",
        WORKS_HEAVY_SUBMISSION_WORKER_ENABLED: process.env.WORKS_HEAVY_SUBMISSION_WORKER_ENABLED || "true",
        WORKS_HEAVY_RECOVERY_POLLING_INTERVAL_MS: process.env.WORKS_HEAVY_RECOVERY_POLLING_INTERVAL_MS || "30000",
        WORKS_HEAVY_RECOVERY_POLLING_BATCH_LIMIT: process.env.WORKS_HEAVY_RECOVERY_POLLING_BATCH_LIMIT || "2",
        WORKS_HEAVY_BACKGROUND_TASK_CONCURRENCY: process.env.WORKS_HEAVY_BACKGROUND_TASK_CONCURRENCY || "1",
        ...serverRuntimeEnv,
      },
    },
    {
      name: "ai-omni-web",
      cwd: __dirname,
      script: "node",
      args: "scripts/run-web-standalone.cjs",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        HOSTNAME: "127.0.0.1",
        ENABLE_RUNTIME_DEBUG: process.env.ENABLE_RUNTIME_DEBUG || "false",
        NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG: process.env.NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG || "false",
      },
    },
  ],
};
