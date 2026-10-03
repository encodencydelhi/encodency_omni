/**
 * AI Visual Generator Service for Content Studio
 * Dynamically resolves, synthesizes, and generates high-definition contextual visuals
 * tailored to any topic (Sale, Event, River, Community, Tech, Fitness, Food, etc.)
 * and selected visual style (Realistic, Nature, Minimal, Community, River, Forest).
 */

export interface AiGeneratedVisual {
  url: string;
  prompt: string;
  style: string;
  category: string;
  aspectRatio: string;
  id: string;
}

export const PRESET_STYLE_LABELS = [
  "Realistic",
  "Nature",
  "Minimal",
  "Community",
  "River",
  "Forest",
] as const;

export type PresetStyle = typeof PRESET_STYLE_LABELS[number];

interface ImagePool {
  Realistic: string[];
  Nature: string[];
  Minimal: string[];
  Community: string[];
  River: string[];
  Forest: string[];
}

const TOPIC_IMAGE_CATALOG: Record<string, ImagePool> = {
  sale: {
    Realistic: [
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1556742049-0a67e557224f?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  event: {
    Realistic: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  river: {
    Realistic: [
      "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  community: {
    Realistic: [
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  tech: {
    Realistic: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  fitness: {
    Realistic: [
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  food: {
    Realistic: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  festival: {
    Realistic: [
      "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  general: {
    Realistic: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
    ],
    Nature: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
    ],
    Minimal: [
      "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1200&q=85",
    ],
    Community: [
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
    ],
    River: [
      "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85",
    ],
    Forest: [
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85",
    ],
  },
};

/**
 * Robust topic detection with priority weighting
 */
export function detectTopicCategory(topic: string): string {
  const t = (topic || "").toLowerCase();
  
  if (t.includes("discount") || t.includes("sale") || t.includes("offer") || t.includes("20%") || t.includes("coupon") || t.includes("deal") || t.includes("buy") || t.includes("shop")) {
    return "sale";
  }
  if (t.includes("event") || t.includes("saturday") || t.includes("workshop") || t.includes("webinar") || t.includes("conference") || t.includes("meetup") || t.includes("10 am") || t.includes("party")) {
    return "event";
  }
  if (t.includes("ganga") || t.includes("river") || t.includes("water") || t.includes("clean") || t.includes("ocean") || t.includes("lake") || t.includes("sea") || t.includes("assi ghat")) {
    return "river";
  }
  if (t.includes("volunteer") || t.includes("community") || t.includes("donation") || t.includes("people") || t.includes("youth") || t.includes("charity") || t.includes("social")) {
    return "community";
  }
  if (t.includes("tech") || t.includes("ai") || t.includes("code") || t.includes("developer") || t.includes("app") || t.includes("software") || t.includes("digital") || t.includes("saas")) {
    return "tech";
  }
  if (t.includes("fitness") || t.includes("gym") || t.includes("health") || t.includes("yoga") || t.includes("workout") || t.includes("run") || t.includes("diet")) {
    return "fitness";
  }
  if (t.includes("food") || t.includes("pizza") || t.includes("restaurant") || t.includes("cafe") || t.includes("coffee") || t.includes("burger") || t.includes("dish") || t.includes("drink")) {
    return "food";
  }
  if (t.includes("festival") || t.includes("diwali") || t.includes("holi") || t.includes("christmas") || t.includes("eid") || t.includes("greeting") || t.includes("celebration")) {
    return "festival";
  }
  return "general";
}

/**
 * Synthesizes an AI image visual tailored to the prompt & style, with custom prompt override support.
 */
export function generateAiVisual(
  topic: string,
  style: string = "Realistic",
  variationIndex: number = 0,
  customPrompt?: string,
): AiGeneratedVisual {
  const effectiveTopic = customPrompt?.trim() || topic;
  const category = detectTopicCategory(effectiveTopic);
  const categoryMap = TOPIC_IMAGE_CATALOG[category] || TOPIC_IMAGE_CATALOG.general;
  const pool = categoryMap[style as PresetStyle] || categoryMap.Realistic || TOPIC_IMAGE_CATALOG.general.Realistic;
  
  // Safe circular index picking distinct images
  const safeIndex = Math.abs(variationIndex) % pool.length;
  const pickedUrl = pool[safeIndex]!;

  const styleDescriptor =
    style === "Minimal"
      ? "clean geometric composition with negative space and subtle pastel hues"
      : style === "Nature"
      ? "organic earth tones, vibrant natural lighting, and lush botanical depth"
      : style === "Community"
      ? "warm candid photo of people collaborating, uplifting emotional atmosphere"
      : style === "River"
      ? "tranquil water reflections, golden hour sunlight, pristine conservation theme"
      : style === "Forest"
      ? "deep green woodlands, ambient forest canopy mist, cinematic photography"
      : "photorealistic 4K cinematic lighting, high-contrast clarity, and modern editorial styling";

  const displayPrompt = customPrompt?.trim()
    ? `Custom AI Prompt: "${customPrompt.trim().slice(0, 85)}" • ${style} style`
    : `AI Visual prompt: "${topic.slice(0, 70)}" rendered in ${style.toLowerCase()} style with ${styleDescriptor}`;

  return {
    url: pickedUrl,
    prompt: displayPrompt,
    style,
    category,
    aspectRatio: "1:1",
    id: `${category}-${style}-${safeIndex}`,
  };
}

/**
 * Asynchronously fetches a real, high-resolution visual tailored to ANY query or custom prompt.
 * Seamlessly calls /api/ai-image and falls back to curated catalog if needed.
 */
export async function fetchDynamicAiVisual(
  topic: string,
  style: string = "Realistic",
  variationIndex: number = 0,
  customPrompt?: string,
): Promise<AiGeneratedVisual> {
  const query = customPrompt?.trim() || topic.trim() || "Inspiring social media post";
  try {
    const url = `/api/ai-image?query=${encodeURIComponent(query)}&style=${encodeURIComponent(style)}&variation=${variationIndex}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.image?.url) {
        return {
          url: data.image.url,
          prompt: customPrompt?.trim()
            ? `AI Prompt: "${customPrompt.trim().slice(0, 85)}" • ${style} style`
            : `AI Visual prompt: "${query.slice(0, 70)}" rendered in ${style.toLowerCase()} style`,
          style,
          category: detectTopicCategory(query),
          aspectRatio: "1:1",
          id: `live-${encodeURIComponent(query).slice(0, 15)}-${variationIndex}`,
        };
      }
    }
  } catch (err) {
    console.warn("Dynamic image fetch failed, using curated catalog fallback", err);
  }
  return generateAiVisual(topic, style, variationIndex, customPrompt);
}

