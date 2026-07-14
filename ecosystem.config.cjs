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
        ENABLE_RUNTIME_DEBUG: process.env.ENABLE_RUNTIME_DEBUG || "false",
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
