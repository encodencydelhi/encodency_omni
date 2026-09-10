import Image from "next/image";
import { APP } from "@/config/app";
import { cn } from "@/lib/utils/cn";

/**
 * Brand assets.
 *
 * The corporate logo is the supplied artwork in `public/brand`. Its red block
 * is part of the mark, so the sign-in panel's gradient starts on exactly the
 * same red (sampled from the file) and the block sits on it without a seam.
 */
export const BRAND_ASSETS = {
  /** The supplied artwork: white lettering on the corporate red block. */
  logo: "/brand/encodency-logo.jpg",
  /**
   * The same lettering with the red field masked out, generated from the file
   * above. Used on the brand red itself, where a second red block would show
   * as a visible rectangle.
   */
  wordmarkWhite: "/brand/encodency-wordmark-white.png",
} as const;

const LOGO_ASPECT = 800 / 224;
const WORDMARK_ASPECT = 741 / 109;

interface LogoProps {
  /** Rendered height in pixels; width follows the artwork's aspect ratio. */
  height?: number;
  className?: string;
  priority?: boolean;
  /** Fill the parent container instead of using fixed dimensions */
  fill?: boolean;
}

/** The full lockup, red block included. Use on light surfaces. */
export function EnCodencyLogo({ height = 44, className, priority = false, fill = false }: LogoProps) {
  if (fill) {
    return (
      <Image
        src={BRAND_ASSETS.logo}
        alt={`${APP.vendor} Pvt. Ltd. — Raise the Bar`}
        fill
        priority={priority}
        className={cn("select-none object-cover", className)}
      />
    );
  }
  return (
    <Image
      src={BRAND_ASSETS.logo}
      alt={`${APP.vendor} Pvt. Ltd. — Raise the Bar`}
      width={Math.round(height * LOGO_ASPECT)}
      height={height}
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}

/** The lettering alone, in white. Use on the brand red. */
export function EnCodencyWordmark({ height = 46, className, priority = false }: LogoProps) {
  return (
    <Image
      src={BRAND_ASSETS.wordmarkWhite}
      alt={`${APP.vendor} Pvt. Ltd. — Raise the Bar`}
      width={Math.round(height * WORDMARK_ASPECT)}
      height={height}
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}

const GLYPH_SIZES = {
  sm: "size-7 rounded-md text-[0.6875rem]",
  md: "size-8 rounded-lg text-xs",
  lg: "size-10 rounded-xl text-sm",
} as const;

/**
 * Compact square mark for the collapsed sidebar rail, where the full lockup
 * cannot fit. It reuses the logo's type treatment: bold "en", light "C".
 */
export function BrandGlyph({
  size = "md",
  className,
}: {
  size?: keyof typeof GLYPH_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary font-light tracking-tight text-primary-foreground",
        GLYPH_SIZES[size],
        className,
      )}
    >
      <span className="font-bold">en</span>C<span className="sr-only">{APP.vendor}</span>
    </span>
  );
}
