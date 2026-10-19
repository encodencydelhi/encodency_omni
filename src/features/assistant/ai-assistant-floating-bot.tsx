"use client";

import { useState, useRef, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAssistant } from "./assistant-provider";

export function AiAssistantRobotLottie({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 236 226"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(
        "ai-bot-lottie-float select-none drop-shadow-[0_6px_16px_rgba(59,130,246,0.38)]",
        className,
      )}
    >
      {/* Waving Right Arm + Hand */}
      <g className="ai-bot-lottie-arm-wave">
        <path
          d="M 140 163 C 160 163 174 150 184 128 L 201 139 C 188 168 168 188 140 190 Z"
          fill="#FFFFFF"
          stroke="#0B1120"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 142 184 C 165 182 183 164 196 138 L 200 140 C 187 168 168 187 141 189 Z"
          fill="#E5ECF4"
        />
        <path
          d="M 164 153 C 166 164 173 171 182 173 L 189 162 C 179 160 173 153 171 143 Z"
          fill="#4182FA"
          stroke="#0B1120"
          strokeWidth="3.8"
          strokeLinejoin="round"
        />
        <g className="ai-bot-lottie-hand-wave">
          <path
            d="M 183 128 C 178 121 177 110 179 101 C 180 96 186 96 187 102 L 188 109 L 193 91 C 194 86 201 87 200 93 L 198 106 L 205 90 C 207 85 214 88 212 94 L 206 108 L 214 96 C 217 91 223 95 220 101 L 211 115 L 219 107 C 223 103 228 108 224 113 L 212 129 C 207 136 198 139 190 135 Z"
            fill="#4182FA"
            stroke="#0B1120"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 196 114 Q 204 120 200 129"
            stroke="#0B1120"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </g>

      {/* Left Arm */}
      <g>
        <path
          d="M 65 163 C 52 166 46 177 46 193 V 214 H 65 V 163 Z"
          fill="#FFFFFF"
          stroke="#0B1120"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M 48 193 C 48 179 53 170 63 166 V 212 H 48 Z" fill="#E8EEF6" />
      </g>

      {/* Robot Torso */}
      <g>
        <path
          d="M 65 160 C 65 153 73 150 84 150 H 126 C 137 150 145 153 145 160 V 214 H 65 V 160 Z"
          fill="#FFFFFF"
          stroke="#0B1120"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M 67 158 H 76 V 212 H 67 Z" fill="#E8EEF6" />
        <path d="M 134 158 H 143 V 212 H 134 Z" fill="#E8EEF6" />
        <path
          d="M 65 160 C 65 153 73 150 84 150 H 126 C 137 150 145 153 145 160 V 214 H 65 V 160 Z"
          fill="none"
          stroke="#0B1120"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <g className="ai-bot-lottie-badge">
          <rect
            x="84"
            y="168"
            width="42"
            height="35"
            rx="8"
            fill="#4182FA"
            stroke="#0B1120"
            strokeWidth="3.8"
          />
          <text
            x="105"
            y="193"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="20"
            fontWeight="800"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            letterSpacing="0.5"
          >
            AI
          </text>
        </g>
      </g>

      {/* Robot Head + Antenna + Ears */}
      <g className="ai-bot-lottie-head">
        <g className="ai-bot-lottie-antenna">
          <circle
            cx="105"
            cy="20"
            r="14"
            fill="#60A5FA"
            className="ai-bot-lottie-antenna-glow"
          />
          <line
            x1="105"
            y1="29"
            x2="105"
            y2="52"
            stroke="#FFFFFF"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <line
            x1="105"
            y1="29"
            x2="105"
            y2="52"
            stroke="#0B1120"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <circle
            cx="105"
            cy="20"
            r="9.5"
            fill="#4182FA"
            stroke="#0B1120"
            strokeWidth="3.8"
          />
          <circle cx="102" cy="17" r="2.5" fill="#93C5FD" />
        </g>

        <rect
          x="29"
          y="96"
          width="18"
          height="42"
          rx="9"
          fill="#4182FA"
          stroke="#0B1120"
          strokeWidth="3.8"
        />
        <rect
          x="163"
          y="96"
          width="18"
          height="42"
          rx="9"
          fill="#4182FA"
          stroke="#0B1120"
          strokeWidth="3.8"
        />

        <path
          d="M 41 108 C 41 68 68 50 105 50 C 142 50 169 68 169 108 C 169 140 148 156 105 156 C 62 156 41 140 41 108 Z"
          fill="#FFFFFF"
          stroke="#0B1120"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 46 116 C 48 140 67 152 105 152 C 143 152 162 140 164 116 C 162 143 142 154 105 154 C 68 154 48 143 46 116 Z"
          fill="#E5ECF4"
        />

        <rect
          x="57"
          y="83"
          width="96"
          height="55"
          rx="25"
          fill="#263545"
          stroke="#0B1120"
          strokeWidth="3.8"
        />

        <g className="ai-bot-lottie-eyes">
          <rect x="75" y="103" width="13.5" height="8" rx="4" fill="#18C8F0" />
          <rect x="121.5" y="103" width="13.5" height="8" rx="4" fill="#18C8F0" />
          <path d="M 96 118.5 H 114 A 9 9 0 0 1 96 118.5 Z" fill="#18C8F0" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Floating AI Assistant widget docked on the right side of the admin panel.
 * Waving animated Lottie robot icon with drag-to-reposition and click-to-open.
 */
export function AiAssistantFloatingBot() {
  const { open: openAssistant, isOpen } = useAssistant();
  const [botOffset, setBotOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingBot, setIsDraggingBot] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const isMoved = botOffset.x !== 0 || botOffset.y !== 0;

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: botOffset.x,
      originY: botOffset.y,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < 6) return;
    state.moved = true;
    if (!isDraggingBot) setIsDraggingBot(true);
    setBotOffset({
      x: state.originX + dx,
      y: state.originY + dy,
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const wasMoved = state.moved;
    dragStateRef.current = null;
    setIsDraggingBot(false);
    if (!wasMoved) {
      openAssistant();
    }
  };

  const handleResetPosition = (event: React.MouseEvent) => {
    event.stopPropagation();
    setBotOffset({ x: 0, y: 0 });
  };

  // When modal is open, gently fade out so it doesn't clash with the chat window
  if (isOpen) {
    return null;
  }

  return (
    <aside
      aria-label="AI Assistant Floating Widget"
      className="fixed bottom-14 right-5 sm:bottom-16 sm:right-7 z-40 select-none"
      style={{
        transform: `translate3d(${botOffset.x}px, ${botOffset.y}px, 0)`,
      }}
    >
      <div className="relative group">
        {/* Reset button if user moved the bot */}
        {isMoved && (
          <button
            type="button"
            onClick={handleResetPosition}
            title="Reset to default right-side position"
            aria-label="Reset position"
            className="absolute -top-2 -left-2 z-50 flex size-6 items-center justify-center rounded-full bg-slate-900/90 text-white shadow-xl border border-white/20 hover:bg-blue-600 hover:scale-105 transition-all active:scale-95"
          >
            <RotateCcw className="size-3" />
          </button>
        )}

        {/* Hover Speech Bubble / Tooltip */}
        <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/95 text-white px-3.5 py-2 shadow-2xl border border-white/10 backdrop-blur-md whitespace-nowrap text-xs font-semibold tracking-wide">
            <Sparkles className="size-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span>AI Assistant</span>
            <span className="text-[10.5px] text-slate-400 font-normal border-l border-white/15 pl-2">
              Click to chat
            </span>
          </div>
          <div className="size-2 bg-slate-950/95 rotate-45 -ml-1 border-r border-t border-white/10" />
        </div>

        {/* Main Floating Bot Button (No box background, pure floating animated robot) */}
        <button
          type="button"
          title="AI Assistant — Click to open, drag to move (double-click to reset)"
          aria-label="AI Assistant"
          aria-haspopup="dialog"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={() => setBotOffset({ x: 0, y: 0 })}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openAssistant();
            }
          }}
          className={cn(
            "relative flex items-center justify-center p-0 bg-transparent border-0 shadow-none outline-none touch-none select-none transition-transform duration-300",
            isDraggingBot ? "cursor-grabbing scale-110" : "cursor-grab hover:scale-110 active:scale-95",
          )}
        >
          {/* Subtle soft ambient aura behind the robot */}
          <span
            className={cn(
              "pointer-events-none absolute inset-0 -m-3 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.22)_0%,_rgba(34,211,238,0.12)_45%,_transparent_70%)] blur-lg transition-opacity duration-300",
              "opacity-75 group-hover:opacity-100",
            )}
          />

          {/* Animated Waving Lottie Robot */}
          <AiAssistantRobotLottie
            className="relative z-10 size-[74px] sm:size-[86px] transition-all duration-300 drop-shadow-[0_12px_24px_rgba(59,130,246,0.4)] group-hover:drop-shadow-[0_18px_36px_rgba(59,130,246,0.65)]"
          />
        </button>
      </div>
    </aside>
  );
}
