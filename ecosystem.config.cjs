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
      cwd: path.join(__dirname, "apps", "web"),
      script: path.join(__dirname, "node_modules", "next", "dist", "bin", "next"),
      interpreter: "node",
      args: "start --hostname 127.0.0.1 --port 3001",
      env: {
        NODE_ENV: "production",
        ENABLE_RUNTIME_DEBUG: process.env.ENABLE_RUNTIME_DEBUG || "false",
        NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG: process.env.NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG || "false",
      },
    },
  ],
};
