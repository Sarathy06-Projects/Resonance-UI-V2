/**
 * Crop presets and the canvas work behind <ImageCropper>.
 *
 * Configuration rather than a component per surface: adding project
 * thumbnails or portfolio media later should be a new entry here, not another
 * cropper. The preset is the single source of truth for the ratio the editor
 * locks to, the size it writes, and the shape it previews.
 */

export type CropShape = "circle" | "rectangle";

export interface CropPreset {
  /** Stable key, also used as the dialog's copy hook. */
  type: "avatar" | "cover";
  /** width / height. The editor locks the crop box to this. */
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  /** How the result is displayed in the product, so the editor can preview it. */
  shape: CropShape;
  title: string;
  /** Shown under the crop area - what the recommended source looks like. */
  hint: string;
}

export const CROP_PRESETS = {
  avatar: {
    type: "avatar",
    aspectRatio: 1,
    outputWidth: 400,
    outputHeight: 400,
    shape: "circle",
    title: "Position your photo",
    hint: "Recommended 400 × 400 or larger. Shown as a circle across Resonance.",
  },
  cover: {
    type: "cover",
    aspectRatio: 1584 / 396,
    outputWidth: 1584,
    outputHeight: 396,
    shape: "rectangle",
    title: "Position your cover",
    hint: "Recommended 1584 × 396. The middle stays visible on every screen size.",
  },
} satisfies Record<string, CropPreset>;

export type CropPresetKey = keyof typeof CROP_PRESETS;

/** The crop rectangle in *source image* pixels, plus the zoom that produced it. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only ever used on blob: URLs from a local file, but harmless and needed
    // if this is ever pointed at a CDN image for re-cropping.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

/**
 * The scale at which the image exactly covers the crop box - object-fit:
 * cover, expressed as a number so the same value drives both the on-screen
 * transform and the export maths.
 *
 * Zoom multiplies this and is clamped to >= 1, which is what guarantees the
 * crop box is never able to show past the edge of the image. Distortion is
 * impossible by construction: there is one scale, applied to both axes.
 */
export function coverScale(imageWidth: number, imageHeight: number, boxWidth: number, boxHeight: number): number {
  return Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
}

/** How far the image may be dragged before an edge would enter the crop box. */
export function panBounds(displayWidth: number, displayHeight: number, boxWidth: number, boxHeight: number) {
  return {
    maxX: Math.max(0, (displayWidth - boxWidth) / 2),
    maxY: Math.max(0, (displayHeight - boxHeight) / 2),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Maps the on-screen crop box back to source pixels.
 *
 * Everything the editor tracks is in CSS pixels against a box whose size
 * depends on the viewport; this converts once, at export, so the output does
 * not silently depend on how wide the dialog happened to be.
 */
export function toSourceRect(
  image: { naturalWidth: number; naturalHeight: number },
  box: { width: number; height: number },
  zoom: number,
  offset: { x: number; y: number }
): CropRect {
  const scale = coverScale(image.naturalWidth, image.naturalHeight, box.width, box.height) * zoom;
  const displayWidth = image.naturalWidth * scale;
  const displayHeight = image.naturalHeight * scale;

  // Top-left of the rendered image relative to the crop box.
  const left = (box.width - displayWidth) / 2 + offset.x;
  const top = (box.height - displayHeight) / 2 + offset.y;

  return {
    x: -left / scale,
    y: -top / scale,
    width: box.width / scale,
    height: box.height / scale,
  };
}

export interface CropResult {
  file: File;
  width: number;
  height: number;
  /** True when the source could not fill the preset's output size. */
  isLowResolution: boolean;
}

/**
 * Renders the chosen region to a file at the preset's output size.
 *
 * Deliberately never upscales. When the selected region is smaller than the
 * preset - someone cropping a 240px avatar out of a small photo - the output
 * is written at the region's own size instead of being stretched up to 400.
 * Interpolating missing detail does not add any; it just makes a soft image
 * that is also four times the bytes, and the display is object-cover either
 * way so the result looks identical apart from being sharper.
 */
export async function renderCrop(
  image: HTMLImageElement,
  rect: CropRect,
  preset: CropPreset,
  sourceType: string
): Promise<CropResult> {
  const naturalWidth = Math.round(rect.width);
  const outputWidth = Math.min(preset.outputWidth, Math.max(1, naturalWidth));
  const outputHeight = Math.max(1, Math.round(outputWidth / preset.aspectRatio));
  const isLowResolution = outputWidth < preset.outputWidth;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, outputWidth, outputHeight);

  // webp keeps transparency and is markedly smaller than png; browsers that
  // cannot encode it fall back to png automatically, which also keeps alpha.
  // jpeg is avoided on purpose - it would flatten a transparent logo avatar
  // onto black. The backend re-encodes to webp regardless (lib/storage.ts), so
  // this only has to survive one hop.
  const type = sourceType === "image/jpeg" ? "image/jpeg" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.95));
  if (!blob) throw new Error("Could not prepare the image.");

  const extension = blob.type.split("/")[1]?.split("+")[0] ?? "png";
  const file = new File([blob], `${preset.type}.${extension}`, { type: blob.type });

  return { file, width: outputWidth, height: outputHeight, isLowResolution };
}
