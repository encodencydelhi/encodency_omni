import { NextRequest, NextResponse } from "next/server";

/**
 * Intelligent visual subject extraction using OpenAI gpt-4o-mini if available,
 * with robust local regex fallback.
 */
async function extractVisualSearchKeywords(rawPrompt: string, openaiKey?: string): Promise<string> {
  const trimmed = rawPrompt.trim();
  if (trimmed.length <= 40) return trimmed;

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You extract 2-4 clean photographic search terms representing the visual subject of a prompt. Return ONLY the search terms separated by space or commas, nothing else. Never return negative words like avoid, clutter, format, 1080x1080.",
            },
            {
              role: "user",
              content: trimmed,
            },
          ],
          temperature: 0.1,
          max_tokens: 25,
        }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        const extracted = data.choices?.[0]?.message?.content?.trim();
        if (extracted && extracted.length < 80) {
          return extracted;
        }
      }
    } catch {
      // Fall through to regex-based extraction
    }
  }

  // Fast local keyword extraction fallback
  const lower = trimmed.toLowerCase();
  if (lower.includes("brics") || lower.includes("summit") || lower.includes("diplomacy") || lower.includes("g20")) {
    return "international summit world leaders diplomacy";
  }

  let clean = trimmed
    .replace(/^(create|write|generate|make|draft)\s+(an?\s+)?(instagram|facebook|twitter|linkedin|social\s+media)?\s*(post|reel|story|carousel|content|caption|ad|blog)?\s*(about|on|for|regarding)?\s*/gi, "")
    .replace(/\b(with\s+a\s+[^.]*tone|keep\s+it\s+[^.]*|motivating[^.]*|eco-friendly[^.]*)\b/gi, "")
    .replace(/\b(avoid\s+[^.]*|distorted\s+[^.]*|format\s*:\s*[^.]*|1080x1080|1:1)\b/gi, "")
    .replace(/\b(photo\s+of\s+a|photo\s+of|image\s+of|picture\s+of)\b/gi, "")
    .replace(/[.,!?;:*]+/g, " ")
    .trim();

  // Keep first 5 words
  const words = clean.split(/\s+/).filter(Boolean);
  return words.slice(0, 5).join(" ") || trimmed.slice(0, 40);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = (searchParams.get("query") || "").trim();
  const style = (searchParams.get("style") || "Realistic").trim();
  const variation = parseInt(searchParams.get("variation") || "0", 10) || 0;

  if (!rawQuery) {
    return NextResponse.json({ success: false, message: "Query required" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const visualKeywords = await extractVisualSearchKeywords(rawQuery, openaiKey);

  // Search with the smart visual keywords
  const candidateQueries = [
    visualKeywords,
    visualKeywords.includes("summit") ? "international summit world leaders" : null,
    rawQuery.toLowerCase().includes("brics") ? "world leaders diplomacy conference" : null,
  ].filter(Boolean) as string[];

  for (const queryToTry of candidateQueries) {
    try {
      let searchQuery = queryToTry;
      if (style && style !== "Realistic" && !queryToTry.toLowerCase().includes(style.toLowerCase())) {
        searchQuery = `${queryToTry} ${style.toLowerCase()}`;
      }

      const apiUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20`;
      const res = await fetch(apiUrl, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });

      if (res.ok) {
        const data = await res.json();
        const results = (data?.results || []).map((r: any) => ({
          url: r.urls?.regular || r.urls?.full || r.urls?.small,
          thumb: r.urls?.small || r.urls?.thumb,
          alt: r.alt_description || queryToTry,
          author: r.user?.name || "Unsplash Photographer",
        })).filter((img: any) => Boolean(img.url));

        if (results.length > 0) {
          const safeIndex = Math.abs(variation) % results.length;
          return NextResponse.json({
            success: true,
            image: results[safeIndex],
            total: results.length,
            query: queryToTry,
            extractedFrom: rawQuery.slice(0, 60),
            style,
            provider: "SMART_VISUAL_ENGINE",
          });
        }
      }
    } catch {
      // Continue to next candidate query
    }
  }

  return NextResponse.json({
    success: false,
    message: "No specific images found",
    query: visualKeywords,
  });
}
