import { cn } from "@/lib/utils/cn";

/**
 * Animated "under construction" icon: a hard hat that bobs while a small hammer taps and throws a spark.
 * Lottie-style (inline SVG + CSS keyframes in globals.css, like the AI assistant robot), so there is no extra package or file to load.
 * The motion stops for people who ask their system for reduced motion.
 */
export function UnderConstructionLottie({ size = 18, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  // The size is set on the SVG itself (not through a utility class), so it can never grow to the width of its container.
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ width: size, height: size, ...style }} className={cn("shrink-0 select-none", className)} fill="none" aria-hidden="true" focusable="false">
      <g className="uc-lottie-hat">
        <path d="M3 16.5a7 7 0 0 1 14 0z" fill="#FBBF24" />
        <rect x="8.6" y="8.8" width="2.8" height="7.7" rx="1.2" fill="#F59E0B" />
        <path d="M5.4 14.3a4.9 4.9 0 0 1 2.1-3.3" stroke="#FEF3C7" strokeWidth="1" strokeLinecap="round" />
        <rect x="1.5" y="16.5" width="17" height="2.7" rx="1.35" fill="#F59E0B" />
      </g>
      <g className="uc-lottie-hammer">
        <rect x="17.7" y="5.2" width="1.6" height="9" rx="0.8" fill="#CBD5E1" />
        <rect x="15.3" y="3.2" width="6.4" height="3.4" rx="1" fill="#94A3B8" />
      </g>
      <circle className="uc-lottie-spark" cx="14.2" cy="6.2" r="1.15" fill="#FDE68A" />
    </svg>
  );
}
