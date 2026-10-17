import { NextRequest, NextResponse } from "next/server";

const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "http://127.0.0.1:4000").replace(/\/$/, "");

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes max duration

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "http://localhost:3000",
    };

    const cookie = req.headers.get("cookie");
    if (cookie) headers["cookie"] = cookie;

    const companyId = req.headers.get("x-company-id");
    if (companyId) headers["x-company-id"] = companyId;

    const clientId = req.headers.get("x-client-id");
    if (clientId) headers["x-client-id"] = clientId;

    const backendUrl = `${BACKEND_ORIGIN}/api/v1/ai/generate-image`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `Backend returned HTTP ${res.status}` };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Next.js proxy route handler error for generate-image:", err);
    return NextResponse.json(
      { message: err?.message || "Internal server error during image generation proxy" },
      { status: 500 }
    );
  }
}
