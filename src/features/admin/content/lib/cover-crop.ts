export interface CropRect { sx: number; sy: number; sw: number; sh: number }

/** The centred part of a source image that has the target's shape, so a resize to the target never stretches or squashes it. */
export function coverCrop(srcWidth: number, srcHeight: number, dstWidth: number, dstHeight: number): CropRect {
  const source = srcWidth / srcHeight;
  const target = dstWidth / dstHeight;
  if (Math.abs(source - target) < 0.002) return { sx: 0, sy: 0, sw: srcWidth, sh: srcHeight };
  if (source > target) {
    const sw = Math.round(srcHeight * target);
    return { sx: Math.round((srcWidth - sw) / 2), sy: 0, sw, sh: srcHeight };
  }
  const sh = Math.round(srcWidth / target);
  return { sx: 0, sy: Math.round((srcHeight - sh) / 2), sw: srcWidth, sh };
}

/** Resizes a generated image (a data URL) to exactly the canvas, cropping the edges that do not fit. Browser only. */
export async function fitToCanvas(dataUrl: string, canvas: { width: number; height: number }): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The generated image could not be read.")); image.src = dataUrl; });
  if (image.naturalWidth === canvas.width && image.naturalHeight === canvas.height) return dataUrl;
  const { sx, sy, sw, sh } = coverCrop(image.naturalWidth, image.naturalHeight, canvas.width, canvas.height);
  const surface = document.createElement("canvas");
  surface.width = canvas.width;
  surface.height = canvas.height;
  const context = surface.getContext("2d");
  if (!context) throw new Error("This browser cannot resize the generated image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return surface.toDataURL("image/jpeg", 0.92);
}
