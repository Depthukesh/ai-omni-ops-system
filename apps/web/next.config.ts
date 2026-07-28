import path from "node:path";
import type { NextConfig } from "next";

const isSandboxEnvironment =
  Boolean(process.env.TRAE_SANDBOX_CLI_PATH) ||
  Boolean(process.env.TRAE_SANDBOX_CONFIG_NAME) ||
  Boolean(process.env.TRAE_AI_SHELL_ID);
const shouldForceWasmBinary = process.env.NEXT_FORCE_WASM_BINARY === "1" || isSandboxEnvironment;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  ...(shouldForceWasmBinary
    ? {
        experimental: {
          useWasmBinary: true,
        },
      }
    : {}),
};

export default nextConfig;
