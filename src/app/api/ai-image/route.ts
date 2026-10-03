import { NextRequest, NextResponse } from "next/server";

function extractCleanTopic(raw: string): string {
  let clean = raw
    .replace(/^(create|write|generate|make|draft)\s+(an?\s+)?(instagram|facebook|twitter|linkedin|social\s+media)?\s*(post|reel|story|carousel|content|caption|ad|blog)?\s*(about|on|for|regarding)?\s*/gi, "")
    .replace(/\b(with\s+a\s+[^.]*tone|keep\s+it\s+[^.]*|motivating[^.]*|eco-friendly[^.]*)\b/gi, "")
    .replace(/\b(photo\s+of\s+a|photo\s+of|image\s+of|picture\s+of)\b/gi, "")
    .replace(/[.,!?;:]+$/g, "")
    .trim();

  return clean || raw;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = (searchParams.get("query") || "").trim();
  const style = (searchParams.get("style") || "Realistic").trim();
  const variation = parseInt(searchParams.get("variation") || "0", 10) || 0;

  if (!rawQuery) {
    return NextResponse.json({ success: false, message: "Query required" }, { status: 400 });
  }

  const cleanQuery = extractCleanTopic(rawQuery);

  // 1. If OPENAI_API_KEY is configured, prioritize OpenAI DALL-E / GPT-Image generation
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const fullPrompt = `${cleanQuery}, ${style} style, high quality photography, vibrant, 4k`;
      const candidateModels = ["gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"];

      for (const model of candidateModels) {
        try {
          const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model,
              prompt: fullPrompt,
              n: 1,
              size: model === "dall-e-2" ? "512x512" : "1024x1024",
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (res.ok) {
            const data = await res.json();
            const imageUrl = data.data?.[0]?.url || (data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);
            if (imageUrl) {
              return NextResponse.json({
                success: true,
                image: {
                  url: imageUrl,
                  alt: cleanQuery,
                  author: `OpenAI ${model}`,
                },
                provider: "OPENAI",
                model,
                query: cleanQuery,
                style,
              });
            }
          }
        } catch {
          // Continue to next candidate model if one fails or times out
        }
      }
    } catch (err: any) {
      console.warn("OpenAI image generation fallback:", err?.message);
    }
  }

  // 2. High-speed, high-resolution topic & keyword search fallback
  try {
    let searchQuery = cleanQuery;
    if (style && style !== "Realistic" && !cleanQuery.toLowerCase().includes(style.toLowerCase())) {
      searchQuery = `${cleanQuery} ${style.toLowerCase()}`;
    }

    const apiUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20`;
    let res = await fetch(apiUrl, { next: { revalidate: 3600 } });

    let data = res.ok ? await res.json() : null;
    if (!data?.results?.length && searchQuery !== cleanQuery) {
      res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(cleanQuery)}&per_page=20`, { next: { revalidate: 3600 } });
      data = res.ok ? await res.json() : null;
    }

    const results = (data?.results || []).map((r: any) => ({
      url: r.urls?.regular || r.urls?.full || r.urls?.small,
      thumb: r.urls?.small || r.urls?.thumb,
      alt: r.alt_description || cleanQuery,
      author: r.user?.name || "AI Visual Creator",
    })).filter((img: any) => Boolean(img.url));

    if (results.length > 0) {
      const safeIndex = Math.abs(variation) % results.length;
      return NextResponse.json({
        success: true,
        image: results[safeIndex],
        total: results.length,
        query: cleanQuery,
        style,
        provider: "HD_IMAGE_ENGINE",
      });
    }

    return NextResponse.json({ success: false, message: "No images found for query", query: cleanQuery });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
