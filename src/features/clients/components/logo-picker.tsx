"use client";

import { ImageUpIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "./client-avatar";

const MAX_BYTES = 512 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * A logo chosen from the operator's device, previewed locally. Nothing is
 * uploaded: in this phase the image is kept as a data URL with the client.
 */
export function LogoPicker({ name, value, onChange }: { name: string; value: string | null; onChange: (value: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a PNG, JPG, WebP or SVG image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("The logo must be 512 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      onChange(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => setError("The image could not be read.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <ClientAvatar name={name || "Client"} logo={value} className="size-12" />
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            <ImageUpIcon />
            {value ? "Replace logo" : "Choose logo"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setError(null); onChange(null); if (input.current) input.current.value = ""; }}>
              <Trash2Icon />
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          aria-label="Client logo file"
          tabIndex={-1}
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-2xs text-danger">
          {error}
        </p>
      ) : (
        <p className="text-2xs text-muted-foreground">Preview only - the file stays in this browser. PNG, JPG, WebP or SVG up to 512 KB.</p>
      )}
    </div>
  );
}
