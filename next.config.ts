import type { NextConfig } from "next";

/**
 * Server-side only (no NEXT_PUBLIC_ prefix): where the Next.js server forwards
 * same-origin `/api/*` requests. The browser always talks to its own origin,
 * so the backend's HttpOnly session cookie and CSRF origin check work without
 * any cross-origin (CORS) exposure.
 */
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge sits on top of the sign-in logo.
  devIndicators: false,
  // Lets a verification build/dev server write elsewhere without touching a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
