import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const localApiBaseUrl = String(process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:3011/api").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${localApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
