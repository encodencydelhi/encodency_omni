"use client";
import { useEffect } from "react";
import { publicAsset, usePublicIdentity } from "../live/public-identity";

export function IdentityDocument() {
  const { data } = usePublicIdentity();
  useEffect(() => {
    if (!data) return;
    const shortName = data["identity.platform_short_name"];
    const name = typeof shortName === "string" ? shortName : data["identity.platform_name"];
    if (typeof name === "string") {
      const page = document.title.includes(" · ") ? document.title.split(" · ").slice(0, -1).join(" · ") : "";
      document.title = page ? `${page} · ${name}` : name;
    }
    for (const [rel, kind] of [["icon", "favicon"], ["apple-touch-icon", "app_icon"]] as const) {
      const asset = publicAsset(data, kind);
      const url = asset?.source === "uploaded" ? asset.url : kind === "favicon" ? "/icon.svg" : null;
      if (!url) { document.querySelector(`link[rel="${rel}"]`)?.remove(); continue; }
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) { link = document.createElement("link"); link.rel = rel; document.head.appendChild(link); }
      link.href = url; link.type = asset?.source === "uploaded" ? asset.mimeType : "image/svg+xml";
    }
  }, [data]);
  return null;
}
