"use client";

import { cn } from "@/lib/utils/cn";

export type AnimatedIconName =
  | "dashboard"
  | "companies"
  | "users"
  | "clients"
  | "team"
  | "plans"
  | "billing"
  | "usage"
  | "integrations"
  | "health"
  | "jobs"
  | "apiMonitoring"
  | "webhooks"
  | "flags"
  | "audit"
  | "support"
  | "assistant"
  | "notifications"
  | "settings";

interface Part {
  tag: "path" | "circle";
  attrs: Record<string, string | number>;
  /** The motion this part plays (a class from globals.css); parts without one stay still. */
  cls?: string;
  delay?: string;
}

const GLYPHS: Record<AnimatedIconName, Part[]> = {
  "dashboard": [
    {
      "tag": "path",
      "attrs": {
        "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
      },
      "cls": "ai-hop"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      },
      "cls": "ai-hop"
    }
  ],
  "companies": [
    {
      "tag": "path",
      "attrs": {
        "d": "M10 12h4"
      },
      "cls": "ai-blink"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M10 8h4"
      },
      "cls": "ai-blink",
      "delay": ".28s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M14 21v-3a2 2 0 0 0-4 0v3"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"
      }
    }
  ],
  "users": [
    {
      "tag": "path",
      "attrs": {
        "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M16 3.128a4 4 0 0 1 0 7.744"
      },
      "cls": "ai-bob",
      "delay": ".14s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M22 21v-2a4 4 0 0 0-3-3.87"
      },
      "cls": "ai-bob",
      "delay": ".14s"
    },
    {
      "tag": "circle",
      "attrs": {
        "cx": "9",
        "cy": "7",
        "r": "4"
      },
      "cls": "ai-bob"
    }
  ],
  "clients": [
    {
      "tag": "path",
      "attrs": {
        "d": "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M8 14h8"
      },
      "cls": "ai-peek"
    }
  ],
  "team": [
    {
      "tag": "path",
      "attrs": {
        "d": "M10 15H6a4 4 0 0 0-4 4v2"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m14.305 16.53.923-.382"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m15.228 13.852-.923-.383"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m16.852 12.228-.383-.923"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m16.852 17.772-.383.924"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m19.148 12.228.383-.923"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m19.53 18.696-.382-.924"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m20.772 13.852.924-.383"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m20.772 16.148.924.383"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "circle",
      "attrs": {
        "cx": "18",
        "cy": "15",
        "r": "3"
      },
      "cls": "ai-cog"
    },
    {
      "tag": "circle",
      "attrs": {
        "cx": "9",
        "cy": "7",
        "r": "4"
      }
    }
  ],
  "plans": [
    {
      "tag": "path",
      "attrs": {
        "d": "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
      },
      "cls": "ai-layer-up"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
      },
      "cls": "ai-layer-down"
    }
  ],
  "billing": [
    {
      "tag": "path",
      "attrs": {
        "d": "M12 17V7"
      },
      "cls": "ai-coin"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"
      },
      "cls": "ai-coin"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"
      }
    }
  ],
  "usage": [
    {
      "tag": "path",
      "attrs": {
        "d": "m12 14 4-4"
      },
      "cls": "ai-needle"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M3.34 19a10 10 0 1 1 17.32 0"
      }
    }
  ],
  "integrations": [
    {
      "tag": "path",
      "attrs": {
        "d": "M12 22v-5"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M15 8V2"
      },
      "cls": "ai-plug"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z"
      },
      "cls": "ai-plug"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M9 8V2"
      },
      "cls": "ai-plug"
    }
  ],
  "health": [
    {
      "tag": "path",
      "attrs": {
        "d": "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
      },
      "cls": "ai-beat"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27",
        "pathLength": 1
      },
      "cls": "ai-draw"
    }
  ],
  "jobs": [
    {
      "tag": "path",
      "attrs": {
        "d": "M13 5h8"
      },
      "cls": "ai-slide",
      "delay": ".05s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M13 12h8"
      },
      "cls": "ai-slide",
      "delay": ".15s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M13 19h8"
      },
      "cls": "ai-slide",
      "delay": ".25s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m3 17 2 2 4-4"
      },
      "cls": "ai-pop",
      "delay": ".2s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m3 7 2 2 4-4"
      },
      "cls": "ai-pop"
    }
  ],
  "apiMonitoring": [
    {
      "tag": "path",
      "attrs": {
        "d": "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
        "pathLength": 1
      },
      "cls": "ai-draw"
    }
  ],
  "webhooks": [
    {
      "tag": "path",
      "attrs": {
        "d": "M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"
      },
      "cls": "ai-seq"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"
      },
      "cls": "ai-seq",
      "delay": ".22s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"
      },
      "cls": "ai-seq",
      "delay": ".44s"
    }
  ],
  "flags": [
    {
      "tag": "path",
      "attrs": {
        "d": "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
      },
      "cls": "ai-wave"
    }
  ],
  "audit": [
    {
      "tag": "path",
      "attrs": {
        "d": "M15 12h-5",
        "pathLength": 1
      },
      "cls": "ai-draw",
      "delay": ".3s"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M15 8h-5",
        "pathLength": 1
      },
      "cls": "ai-draw"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M19 17V5a2 2 0 0 0-2-2H4"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"
      }
    }
  ],
  "support": [
    {
      "tag": "path",
      "attrs": {
        "d": "M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"
      },
      "cls": "ai-tilt"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M21 16v2a4 4 0 0 1-4 4h-5"
      },
      "cls": "ai-tilt"
    }
  ],
  "assistant": [
    {
      "tag": "path",
      "attrs": {
        "d": "M12 6V2H8"
      },
      "cls": "ai-antenna"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M15 11v2"
      },
      "cls": "ai-eye"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M2 12h2"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M20 12h2"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"
      }
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M9 11v2"
      },
      "cls": "ai-eye"
    }
  ],
  "notifications": [
    {
      "tag": "path",
      "attrs": {
        "d": "M10.268 21a2 2 0 0 0 3.464 0"
      },
      "cls": "ai-ring"
    },
    {
      "tag": "path",
      "attrs": {
        "d": "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
      },
      "cls": "ai-ring"
    }
  ],
  "settings": [
    {
      "tag": "path",
      "attrs": {
        "d": "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
      },
      "cls": "ai-spin"
    },
    {
      "tag": "circle",
      "attrs": {
        "cx": "12",
        "cy": "12",
        "r": "3"
      },
      "cls": "ai-spin"
    }
  ]
};

export function AnimatedIcon({ name, size = 16, className, active = false }: { name: AnimatedIconName; size?: number; className?: string; active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("ai shrink-0", className)}
      data-active={active ? "true" : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name].map((part, index) => {
        const Tag = part.tag;
        return <Tag key={index} {...part.attrs} className={part.cls} style={part.delay ? { animationDelay: part.delay } : undefined} />;
      })}
    </svg>
  );
}
