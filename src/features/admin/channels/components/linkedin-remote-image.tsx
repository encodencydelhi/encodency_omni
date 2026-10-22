"use client";

import { useState, type ReactNode } from "react";
import Image, { type ImageProps } from "next/image";

type LinkedInRemoteImageProps = Omit<ImageProps, "unoptimized" | "onError"> & {
  fallback: ReactNode;
};

export function LinkedInRemoteImage({ alt, fallback, src, ...props }: LinkedInRemoteImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceKey = typeof src === "string" ? src : "default" in src ? src.default.src : src.src;

  if (failedSource === sourceKey) return fallback;

  return <Image {...props} src={src} alt={alt} unoptimized onError={() => setFailedSource(sourceKey)} />;
}
