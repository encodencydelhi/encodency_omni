"use client";

import Image, { type ImageProps } from "next/image";

/**
 * Creative thumbnails come from Meta's CDN (any fbcdn host) in live mode, which
 * `next/image` would reject unless every host were allow-listed. They are
 * already sized by Meta, so they skip the optimizer; a missing thumbnail
 * renders nothing instead of an empty `src`.
 */
export function AdImage({ src, alt, ...rest }: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  if (!src) return null;
  return <Image src={src} alt={alt} unoptimized {...rest} />;
}
