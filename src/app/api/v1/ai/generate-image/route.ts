import { proxyImageGeneration } from "@/lib/api/image-generation-proxy";

const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "http://127.0.0.1:4000").replace(/\/$/, "");

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  return proxyImageGeneration(request, {
    backendOrigin: BACKEND_ORIGIN,
    appBaseUrl: process.env.APP_BASE_URL,
    production: process.env.NODE_ENV === "production",
  });
}
