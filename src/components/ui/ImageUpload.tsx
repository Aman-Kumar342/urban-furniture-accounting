"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

// Read a chosen file and downscale it to a small square-fitting JPEG thumbnail (data URL), so the
// stored image stays tiny. All processing is client-side; the server just stores the string.
async function toThumbnail(file: File, max = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function ImageUpload({
  name,
  value,
  onChange,
  shape = "circle",
  fallback = "initials",
}: {
  name: string;
  value: string | null;
  onChange: (v: string | null) => void;
  shape?: "circle" | "square";
  fallback?: "initials" | "box";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 12 * 1024 * 1024) return setError("That image is too large (max 12 MB).");
    setBusy(true);
    try {
      onChange(await toThumbnail(file));
    } catch {
      setError("Couldn't read that image. Try another file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || "?"} imageUrl={value} size="lg" shape={shape} fallback={fallback} />
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-label="Upload image" />
          <Button type="button" variant="ghost" loading={busy} onClick={() => inputRef.current?.click()} className="h-9 px-3 text-sm">
            {value ? "Change image" : "Upload image"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange(null)} className="h-9 px-3 text-sm text-oxblood">
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">
          {error ? <span className="text-oxblood">{error}</span> : "PNG or JPG — stored as a small thumbnail."}
        </p>
      </div>
    </div>
  );
}
