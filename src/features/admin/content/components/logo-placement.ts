/**
 * Brand banner: a solid strip along the bottom (18% of the image height) with the logo on the right and the headline on
 * the left, sized so the text never runs under the logo. Pure, unit-tested.
 */
export function bannerLayout(image: { width: number; height: number }, logo: { width: number; height: number } | null) {
  const band = { x: 0, y: Math.round(image.height * 0.82), width: image.width, height: image.height - Math.round(image.height * 0.82) };
  const pad = Math.round(band.height * 0.18);
  let logoBox: { x: number; y: number; width: number; height: number } | null = null;
  if (logo) {
    let height = band.height - pad * 2;
    let width = Math.round(height * (logo.width / logo.height));
    const maxWidth = Math.round(image.width * 0.32);
    if (width > maxWidth) { width = maxWidth; height = Math.round(width * (logo.height / logo.width)); }
    logoBox = { x: image.width - pad - width, y: band.y + Math.round((band.height - height) / 2), width, height };
  }
  const text = { x: pad * 2, y: band.y + Math.round(band.height / 2), maxWidth: (logoBox ? logoBox.x - pad : image.width - pad) - pad * 2, maxFontSize: Math.round(band.height * 0.36) };
  return { band, logo: logoBox, text };
}

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export const LOGO_SIZES = { small: 0.14, medium: 0.2, large: 0.28 } as const;
export type LogoSize = keyof typeof LOGO_SIZES;

/**
 * Where the logo goes: its width is a share of the image width (height keeps the logo's own shape, never more than 30% of
 * the image height), with a margin of 4% of the shorter side. Pure, unit-tested.
 */
export function logoPlacement(image: { width: number; height: number }, logo: { width: number; height: number }, position: LogoPosition, size: LogoSize) {
  const margin = Math.round(Math.min(image.width, image.height) * 0.04);
  let width = Math.round(image.width * LOGO_SIZES[size]);
  let height = Math.round(width * (logo.height / logo.width));
  const maxHeight = Math.round(image.height * 0.3);
  if (height > maxHeight) { height = maxHeight; width = Math.round(height * (logo.width / logo.height)); }
  const x = position.endsWith("left") ? margin : image.width - margin - width;
  const y = position.startsWith("top") ? margin : image.height - margin - height;
  return { x, y, width, height };
}
