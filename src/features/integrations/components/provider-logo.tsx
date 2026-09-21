/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Official Provider Brand Logos using React Icons (Font Awesome & Simple Icons)
 * High-fidelity brand marks for Meta, Instagram, Facebook, LinkedIn, Google Business, WhatsApp, YouTube, X, GA4, GSC, Cloudinary
 */

import { cn } from "@/lib/utils/cn";
import {
  FaMeta,
  FaInstagram,
  FaFacebookF,
  FaGoogle,
  FaLinkedinIn,
  FaWhatsapp,
  FaYoutube,
  FaXTwitter,
} from "react-icons/fa6";
import {
  SiGoogleanalytics,
  SiGooglesearchconsole,
  SiCloudinary,
} from "react-icons/si";

interface ProviderLogoProps {
  providerId: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function ProviderLogo({
  providerId,
  className,
  size = "md",
}: ProviderLogoProps) {
  const sizeClasses = {
    xs: "size-4",
    sm: "size-5",
    md: "size-8",
    lg: "size-10",
    xl: "size-12",
  };

  const roundedClasses = {
    xs: "rounded",
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-lg",
    xl: "rounded-xl",
  };

  const id = providerId.toLowerCase();

  // Instagram (Official multi-color gradient with FaInstagram)
  if (id === "instagram" || id === "instagram_account") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Instagram"
      >
        <FaInstagram className="w-[62%] h-[62%]" />
      </div>
    );
  }

  // Facebook (Official blue with FaFacebookF)
  if (id === "facebook" || id === "facebook_page") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#1877F2] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Facebook"
      >
        <FaFacebookF className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // Google (FaGoogle on clean white badge)
  if (id === "google") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white border border-slate-200 text-[#4285F4] shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Google"
      >
        <FaGoogle className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // Meta (Official Meta Blue with FaMeta)
  if (id === "meta") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-[#0866FF] to-[#0051d4] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Meta"
      >
        <FaMeta className="w-[60%] h-[60%]" />
      </div>
    );
  }

  // LinkedIn (Official blue with FaLinkedinIn)
  if (id === "linkedin" || id === "linkedin_page") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#0A66C2] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="LinkedIn"
      >
        <FaLinkedinIn className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // Google Business Profile
  if (id === "google_business" || id === "google_business_location") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white border border-slate-200 text-[#4285F4] shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Google Business Profile"
      >
        <FaGoogle className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // WhatsApp (Official WhatsApp Green with FaWhatsapp)
  if (id === "whatsapp" || id === "whatsapp_number") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#25D366] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="WhatsApp"
      >
        <FaWhatsapp className="w-[62%] h-[62%]" />
      </div>
    );
  }

  // YouTube (Official Red with FaYoutube)
  if (id === "youtube" || id === "youtube_channel") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#FF0000] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="YouTube"
      >
        <FaYoutube className="w-[62%] h-[62%]" />
      </div>
    );
  }

  // X / Twitter (Official black with FaXTwitter)
  if (id === "x_twitter" || id === "x" || id === "x_account") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-black text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="X (Twitter)"
      >
        <FaXTwitter className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // Google Analytics 4
  if (id === "ga4" || id === "ga4_property") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#E37400] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Google Analytics 4"
      >
        <SiGoogleanalytics className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // Google Search Console
  if (id === "gsc" || id === "gsc_site") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#1A73E8] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Google Search Console"
      >
        <SiGooglesearchconsole className="w-[58%] h-[58%]" />
      </div>
    );
  }

  // Cloudinary
  if (id === "cloudinary" || id === "cloudinary_cloud") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#3448C5] text-white shadow-2xs shrink-0",
          sizeClasses[size],
          roundedClasses[size],
          className
        )}
        title="Cloudinary"
      >
        <SiCloudinary className="w-[60%] h-[60%]" />
      </div>
    );
  }

  // Fallback icon
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase shadow-2xs shrink-0",
        sizeClasses[size],
        roundedClasses[size],
        className
      )}
    >
      {id.slice(0, 3)}
    </div>
  );
}

export function getPlatformName(id: string): string {
  const key = id.toLowerCase();
  switch (key) {
    case "meta":
      return "Meta";
    case "facebook":
    case "facebook_page":
      return "Facebook";
    case "instagram":
    case "instagram_account":
      return "Instagram";
    case "linkedin":
    case "linkedin_page":
      return "LinkedIn";
    case "google_business":
    case "google_business_location":
      return "Google Business";
    case "whatsapp":
    case "whatsapp_number":
      return "WhatsApp";
    case "youtube":
    case "youtube_channel":
      return "YouTube";
    case "x":
    case "x_twitter":
    case "x_account":
      return "X (Twitter)";
    case "ga4":
    case "ga4_property":
      return "Google Analytics 4";
    case "gsc":
    case "gsc_site":
      return "Google Search Console";
    case "cloudinary":
    case "cloudinary_cloud":
      return "Cloudinary";
    default:
      return id.charAt(0).toUpperCase() + id.slice(1);
  }
}

export function PlatformBadge({
  platform,
  label,
  size = "xs",
  className,
}: {
  platform: string;
  label?: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  const displayLabel = label || getPlatformName(platform);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shrink-0",
        className
      )}
    >
      <ProviderLogo providerId={platform} size={size} />
      <span>{displayLabel}</span>
    </span>
  );
}

