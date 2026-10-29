import type { NextConfig } from "next";
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "http://127.0.0.1:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge sits on top of the sign-in logo.
  devIndicators: false,
  experimental: { turbopackFileSystemCacheForDev: false },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "i9.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn-ei.com",
      },
      {
        protocol: "https",
        hostname: "dms-akam.licdn-ei.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
