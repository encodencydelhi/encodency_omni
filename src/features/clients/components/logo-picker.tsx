"use client";

import { ImageUpIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "./client-avatar";
import { CLIENT_LOGO_UPLOAD_LIMITS } from "@/features/admin/projects/live/clients-api";

interface LogoPickerProps {
  name: string;
  value: string | { url?: string | null; id?: string } | null;
  onChange?: (value: string | null) => void;
  onFileSelect?: (file: File | null) => void;
  onUpload?: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  isUploading?: boolean;
  isRemoving?: boolean;
  disabled?: boolean;
}

/**
 * Client logo picker supporting direct upload/replacement/deletion (IMAGE-01 Phase 3)
 * or local preview selection during client creation.
 * Supported formats: PNG, JPG, WebP up to 5 MB.
 */
export function LogoPicker({
  name,
  value,
  onChange,
  onFileSelect,
  onUpload,
  onRemove,
  isUploading = false,
  isRemoving = false,
  disabled = false,
}: LogoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = isUploading || isRemoving || disabled;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const limits = CLIENT_LOGO_UPLOAD_LIMITS;
    if (!limits.mimeTypes.includes(file.type)) {
      setError("Use a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > limits.maxBytes) {
      setError("The logo must be 5 MB or smaller.");
      return;
    }

    setError(null);

    // If an async onUpload handler is supplied (e.g. for existing clients), call it directly
    if (onUpload) {
      try {
        await onUpload(file);
      } catch (err) {
        // onUpload caller handles toast / error state
      }
      return;
    }

    // Otherwise, generate local preview (e.g. for Add Client wizard before client creation)
    onFileSelect?.(file);
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      onChange?.(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => setError("The image could not be read.");
    reader.readAsDataURL(file);
  };

  const handleRemove = async () => {
    setError(null);
    if (onRemove) {
      await onRemove();
    }
    onChange?.(null);
    onFileSelect?.(null);
    if (input.current) input.current.value = "";
  };

  const hasLogo = Boolean(typeof value === "string" ? value : value?.url);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <ClientAvatar name={name || "Client"} logo={value} className="size-12" />
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {isUploading ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />}
            {isUploading ? "Uploading..." : hasLogo ? "Replace logo" : "Choose logo"}
          </Button>
          {hasLogo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={handleRemove}
            >
              {isRemoving ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              {isRemoving ? "Removing..." : "Remove"}
            </Button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept={CLIENT_LOGO_UPLOAD_LIMITS.mimeTypes.join(",")}
          className="sr-only"
          aria-label="Client logo file"
          tabIndex={-1}
          disabled={busy}
          onChange={(event) => {
            void pick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-2xs text-danger">
          {error}
        </p>
      ) : (
        <p className="text-2xs text-muted-foreground">PNG, JPG or WebP up to 5 MB.</p>
      )}
    </div>
  );
}

