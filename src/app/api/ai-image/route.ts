import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const maxDuration = 60; // Allow up to 60 seconds for AI image generation

/**
 * Dynamically resolves OPENAI_API_KEY from process.env or local .env files
 */
function getOpenAiKey(): string | undefined {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  const candidatePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../encodency_omni_backend/.env"),
    "c:/Users/sompa/Desktop/social_media/encodency_omni/.env",
    "c:/Users/sompa/Desktop/social_media/encodency_omni_backend/.env",
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, "utf8");
        const match = text.match(/OPENAI_API_KEY\s*=\s*(["']?)([^"'\r\n]+)\1/);
        if (match && match[2]) {
          return match[2].trim();
        }
      }
    } catch {}
  }
  return undefined;
}

/**
 * PURE AI IMAGE GENERATION (NO FETCHING / NO STOCK IMAGES).
 * Uses OpenAI gpt-image-1 with the user's OPENAI_API_KEY to generate
 * 100% custom images matching the prompt.
 */
async function generateAiImage(rawPrompt: string, style: string = "Realistic") {
  const prompt = rawPrompt.trim();
  if (!prompt) {
    return NextResponse.json(
      { success: false, message: "Prompt is required for image generation" },
      { status: 400 }
    );
  }

  const openaiKey = getOpenAiKey();
  if (!openaiKey) {
    return NextResponse.json(
      { success: false, message: "OPENAI_API_KEY is not configured in .env" },
      { status: 500 }
    );
  }

  try {
    let finalPrompt = prompt;
    if (style && style !== "Realistic" && !finalPrompt.toLowerCase().includes(style.toLowerCase())) {
      finalPrompt = `${finalPrompt}, in ${style} visual aesthetic`;
    }

    console.log(`[AI Image Generator] Generating image with OpenAI for prompt: "${finalPrompt.slice(0, 100)}..."`);

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: finalPrompt.slice(0, 3900),
        n: 1,
        size: "1024x1024",
      }),
      signal: AbortSignal.timeout(58000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI Image Generator] OpenAI API Error (${res.status}):`, errText);
      return NextResponse.json(
        { success: false, message: `OpenAI error: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { success: false, message: "OpenAI did not return image data" },
        { status: 500 }
      );
    }

    const imageUrl = `data:image/png;base64,${b64}`;

    return NextResponse.json({
      success: true,
      image: {
        url: imageUrl,
        alt: finalPrompt.slice(0, 100),
        author: "OpenAI gpt-image-1",
      },
      provider: "OPENAI_IMAGE",
      prompt: finalPrompt,
    });
  } catch (err: any) {
    console.error("[AI Image Generator] Generation failed:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = (body.prompt || body.query || "").trim();
    const style = (body.style || "Realistic").trim();
    return await generateAiImage(prompt, style);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prompt = (searchParams.get("prompt") || searchParams.get("query") || "").trim();
    const style = (searchParams.get("style") || "Realistic").trim();
    return await generateAiImage(prompt, style);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
