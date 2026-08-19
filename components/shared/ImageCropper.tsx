"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  CROP_PRESETS,
  clamp,
  coverScale,
  loadImage,
  panBounds,
  renderCrop,
  toSourceRect,
  type CropPresetKey,
  type CropResult,
} from "@/lib/imageCrop";

const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;

interface ImageCropperProps {
  /** The picked file. The dialog is open whenever this is set. */
  file: File | null;
  preset: CropPresetKey;
  onCancel: () => void;
  /** Receives the rendered file - the caller does the upload. */
  onApply: (result: CropResult) => Promise<void> | void;
}

/**
 * Upload -> crop -> preview -> save, for any preset in lib/imageCrop.
 *
 * One editor for every surface rather than one per field: the ratio, the
 * output size and the preview shape all come from the preset, so adding
 * project thumbnails later is a config entry rather than another dialog.
 *
 * The image is never scaled on one axis only. A single `scale` - cover-fit
 * times zoom, with zoom clamped to >= 1 - drives both the on-screen transform
 * and the export, so the crop box can never see past the image edge and the
 * result cannot be distorted.
 */
export function ImageCropper({ file, preset: presetKey, onCancel, onApply }: ImageCropperProps) {
  const preset = CROP_PRESETS[presetKey];

  // Derived, not stored. An effect that set these would also have to null them
  // on the way out, which is a setState purely to undo a previous setState -
  // the state is a function of `file` and belongs in render.
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [decoded, setDecoded] = useState<{ src: string; image: HTMLImageElement } | null>(null);
  // Tying the decoded bitmap to the URL it came from is what makes the reset
  // free: a new file changes `src`, the match fails, and the editor is empty
  // again without anything having to clear it.
  const image = decoded && decoded.src === src ? decoded.image : null;
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState({ width: 0, height: 0 });

  const boxRef = useRef<HTMLDivElement>(null);
  // Active pointers, so one finger pans and two pinch. Tracked in a ref rather
  // than state - these update on every move and must not drive re-renders.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ offset: { x: number; y: number }; distance: number; zoom: number } | null>(null);

  // Release the object URL when the file changes or the dialog unmounts.
  useEffect(() => {
    if (!src) return;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  // Decode, and reset the transform for each new file. Every setState here is
  // inside the promise callback - an external system reporting back, which is
  // what an effect is for - rather than in the effect body.
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        setDecoded({ src, image: img });
        setError(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not read that image."));
    return () => {
      cancelled = true;
    };
  }, [src]);

  // The crop box is sized by CSS (it has to be responsive), so its pixel size
  // is measured rather than assumed - every transform and the export maths are
  // expressed against it.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [image]);

  const scale = image && box.width ? coverScale(image.naturalWidth, image.naturalHeight, box.width, box.height) * zoom : 0;
  const displayWidth = image ? image.naturalWidth * scale : 0;
  const displayHeight = image ? image.naturalHeight * scale : 0;

  // Re-clamp whenever zoom or the box changes - zooming out must pull the
  // image back inside the crop area rather than leaving a gap at an edge.
  const clampOffset = useCallback(
    (next: { x: number; y: number }, atZoom = zoom) => {
      if (!image || !box.width) return { x: 0, y: 0 };
      const s = coverScale(image.naturalWidth, image.naturalHeight, box.width, box.height) * atZoom;
      const bounds = panBounds(image.naturalWidth * s, image.naturalHeight * s, box.width, box.height);
      return { x: clamp(next.x, -bounds.maxX, bounds.maxX), y: clamp(next.y, -bounds.maxY, bounds.maxY) };
    },
    [image, box, zoom]
  );

  const applyZoom = useCallback(
    (next: number) => {
      const z = clamp(next, 1, MAX_ZOOM);
      setZoom(z);
      setOffset((current) => clampOffset(current, z));
    },
    [clampOffset]
  );

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // --- pointer handling: one finger pans, two pinch ------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  };

  const startGesture = () => {
    const points = [...pointers.current.values()];
    gesture.current = {
      offset,
      zoom,
      distance: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const previous = new Map(pointers.current);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointers.current.values()];

    if (points.length === 1) {
      const start = [...previous.values()][0];
      setOffset(clampOffset({ x: offset.x + (e.clientX - start.x), y: offset.y + (e.clientY - start.y) }));
      gesture.current.offset = offset;
      return;
    }

    if (points.length === 2 && gesture.current.distance > 0) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      applyZoom(gesture.current.zoom * (distance / gesture.current.distance));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) startGesture();
    else gesture.current = null;
  };

  // Non-passive so the page does not scroll behind the editor while zooming.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom - Math.sign(e.deltaY) * ZOOM_STEP);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, applyZoom]);

  // Would the export be softer than the preset asks for? Computed live so the
  // notice tracks zoom rather than only the source's dimensions.
  const sourceRect = image && box.width ? toSourceRect(image, box, zoom, offset) : null;
  const isLowResolution = sourceRect ? Math.round(sourceRect.width) < preset.outputWidth : false;

  const handleApply = async () => {
    if (!image || !box.width || !file) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await renderCrop(image, toSourceRect(image, box, zoom, offset), preset, file.type);
      await onApply(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that image.");
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{preset.title}</DialogTitle>
          <DialogDescription>Drag to reposition, pinch or scroll to zoom.</DialogDescription>
        </DialogHeader>

        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          // touch-none: the browser's own pan/zoom would otherwise claim the
          // gesture before these handlers see it.
          className="relative w-full touch-none overflow-hidden rounded-xl bg-zinc-100 select-none dark:bg-zinc-900"
          style={{ aspectRatio: String(preset.aspectRatio), cursor: image ? "grab" : "default" }}
        >
          {image && src && (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob being transformed by hand; next/image adds nothing and cannot take a raw object URL
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center"
              style={{
                width: displayWidth,
                height: displayHeight,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}

          {/* Circular mask for avatars, so the framing decision is made against
              the shape the profile actually renders rather than against a
              square the user then has to imagine cropped. */}
          {preset.shape === "circle" && image && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-black/45 [mask-image:radial-gradient(circle_at_center,transparent_calc(50%_-_1px),black_50%)]" />
              <div className="absolute inset-[2px] rounded-full ring-2 ring-white/80" />
            </div>
          )}
          {preset.shape === "rectangle" && image && (
            <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/70">
              {/* Where the profile avatar will overlap the banner. Without it
                  people centre a subject on the left and only discover it is
                  covered after saving - the same reason LinkedIn shows the
                  overlap while you position. Proportional to the crop box so
                  it stays truthful at any dialog width. */}
              {preset.type === "cover" && (
                <div className="absolute bottom-0 left-[4%] aspect-square h-[62%] translate-y-[28%] rounded-full border-2 border-dashed border-white/70 bg-black/25" />
              )}
            </div>
          )}

          {!image && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading image…
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">{preset.hint}</p>

        {isLowResolution && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            This image may appear less sharp at this size.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-500">
            {error}
          </p>
        )}

        {/* Zoom row. A slider so a precise value is reachable, with steppers
            either side for keyboards and for anyone who finds a thin track
            fiddly on a phone. */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => applyZoom(zoom - ZOOM_STEP)}
            disabled={!image || zoom <= 1}
            className="shrink-0 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!image}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 disabled:opacity-40 dark:bg-zinc-800 dark:accent-white"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => applyZoom(zoom + ZOOM_STEP)}
            disabled={!image || zoom >= MAX_ZOOM}
            className="shrink-0 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Stacked and full-width on a phone, where a row of three small
            targets at the foot of a dialog is the usual mis-tap. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={reset}
            disabled={!image || (zoom === 1 && offset.x === 0 && offset.y === 0)}
            className="gap-1.5 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          {/* Reversed on mobile so the order down the screen is Save, Cancel,
              Reset - priority first. Left as Cancel-then-Save on desktop,
              which is where the primary action belongs in a dialog. */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!image || isSaving} className="gap-1.5 font-semibold">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wiring a file input to the cropper, since all four call sites need the same
 * three pieces of state and the same "clear the input so re-picking the same
 * file still fires" detail.
 */
export function useImageCropper() {
  const [file, setFile] = useState<File | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    // Reset immediately: without this, cancelling and re-picking the same file
    // fires no change event and the editor never reopens.
    e.target.value = "";
    if (picked) setFile(picked);
  }, []);

  return { file, setFile, onFileChange, close: useCallback(() => setFile(null), []) };
}
