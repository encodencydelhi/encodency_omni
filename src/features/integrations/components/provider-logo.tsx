/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Official Provider Brand Logos (SVG)
 * High-fidelity brand marks for Meta, LinkedIn, Google Business, WhatsApp, YouTube, X, GA4, GSC, Cloudinary
 */

import { cn } from "@/lib/utils/cn";

interface ProviderLogoProps {
  providerId: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function ProviderLogo({
  providerId,
  className,
  size = "md",
}: ProviderLogoProps) {
  const sizeClasses = {
    sm: "size-5",
    md: "size-8",
    lg: "size-10",
    xl: "size-12",
  };

  const id = providerId.toLowerCase();

  // Meta (Blue gradient loop)
  if (id === "meta") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-gradient-to-br from-[#0866FF] to-[#0051d4] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="Meta"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[62%] h-[62%]">
          <path d="M12 7.2c-2.4 0-4.2 1.9-5.1 3.5C5.8 8.8 4.3 7.8 2.6 7.8 1.2 7.8 0 9 0 10.6c0 2.8 2.7 5.9 5.8 5.9 2.2 0 3.9-1.5 4.8-2.9.9 1.4 2.6 2.9 4.8 2.9 3.1 0 5.8-3.1 5.8-5.9 0-1.6-1.2-2.8-2.6-2.8-1.7 0-3.2 1-4.3 2.9-.9-1.6-2.7-3.5-5.1-3.5zm-5.7 7.4c-1.8 0-3.6-2.1-3.6-4 0-.6.4-1.1 1-1.1 1.2 0 2.4 1.2 3.3 2.7-.3 1.4-.6 2.4-.7 2.4zm10.7 0c-.1 0-.4-1-.7-2.4.9-1.5 2.1-2.7 3.3-2.7.6 0 1 .5 1 1.1 0 1.9-1.8 4-3.6 4z" />
        </svg>
      </div>
    );
  }

  // LinkedIn (Official blue icon)
  if (id === "linkedin") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-[#0A66C2] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="LinkedIn"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z" />
        </svg>
      </div>
    );
  }

  // Google Business Profile (Blue / Multi-color store icon)
  if (id === "google_business") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-white border border-slate-200 shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="Google Business Profile"
      >
        <svg viewBox="0 0 24 24" className="w-[70%] h-[70%]">
          <path fill="#4285F4" d="M21.35 11.1h-9.17v2.98h5.27c-.23 1.22-.92 2.25-1.95 2.94v2.44h3.16c1.85-1.7 2.92-4.21 2.92-7.23 0-.43-.04-.86-.23-1.13z" />
          <path fill="#34A853" d="M12.18 20.45c2.65 0 4.87-.88 6.5-2.39l-3.16-2.45c-.88.59-2 .94-3.34.94-2.57 0-4.75-1.73-5.53-4.06H3.36v2.52c1.64 3.25 5.01 5.44 8.82 5.44z" />
          <path fill="#FBBC05" d="M6.65 12.49c-.2-.59-.31-1.22-.31-1.87s.11-1.28.31-1.87V6.23H3.36C2.69 7.57 2.31 9.07 2.31 10.62s.38 3.05 1.05 4.39l3.29-2.52z" />
          <path fill="#EA4335" d="M12.18 3.73c1.44 0 2.74.5 3.75 1.47l2.81-2.81C17.04.91 14.82 0 12.18 0 8.37 0 5 2.19 3.36 5.44l3.29 2.52c.78-2.33 2.96-4.23 5.53-4.23z" />
        </svg>
      </div>
    );
  }

  // WhatsApp / AiSensy (WhatsApp Green)
  if (id === "whatsapp") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-[#25D366] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="WhatsApp / AiSensy"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[62%] h-[62%]">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.36.06-.55.28-.19.22-.73.71-.73 1.73s.75 2 .85 2.14c.1.14 1.44 2.29 3.56 3.14 1.77.71 2.13.57 2.51.53.39-.04 1.26-.51 1.44-1.01.18-.49.18-.92.12-1.01-.06-.09-.22-.14-.46-.26s-1.44-.71-1.66-.79c-.22-.08-.38-.12-.54.12s-.63.79-.77.95c-.14.16-.28.18-.52.06s-1.02-.38-1.95-1.21c-.72-.64-1.21-1.44-1.35-1.68s-.01-.37.11-.49c.11-.11.24-.28.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42s-.54-1.31-.74-1.8c-.2-.47-.4-.41-.55-.42z" />
        </svg>
      </div>
    );
  }

  // YouTube (Red Play Button)
  if (id === "youtube") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-[#FF0000] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="YouTube"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[65%] h-[65%]">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }

  // X (formerly Twitter)
  if (id === "x_twitter" || id === "x") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-slate-900 text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="X (Twitter)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[55%] h-[55%]">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    );
  }

  // Google Analytics 4 (Orange bar chart)
  if (id === "ga4") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-[#E37400] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="Google Analytics 4"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
          <path d="M19.5 3A2.5 2.5 0 0 0 17 5.5v13a2.5 2.5 0 0 0 5 0v-13A2.5 2.5 0 0 0 19.5 3zm-7 5A2.5 2.5 0 0 0 10 10.5v8a2.5 2.5 0 0 0 5 0v-8A2.5 2.5 0 0 0 12.5 8zm-7 5A2.5 2.5 0 0 0 3 15.5v3a2.5 2.5 0 0 0 5 0v-3A2.5 2.5 0 0 0 5.5 13z" />
        </svg>
      </div>
    );
  }

  // Google Search Console (Cyan & Blue Tool)
  if (id === "gsc") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-[#1A73E8] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="Google Search Console"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[60%] h-[60%]">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      </div>
    );
  }

  // Cloudinary (Cloud icon with blue gradient)
  if (id === "cloudinary") {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-[#3448C5] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          className
        )}
        title="Cloudinary"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[65%] h-[65%]">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
        </svg>
      </div>
    );
  }

  // Fallback icon
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase shadow-2xs shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {id.slice(0, 3)}
    </div>
  );
}
