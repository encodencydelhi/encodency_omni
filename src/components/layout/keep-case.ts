"use client";

import { useEffect, type RefObject } from "react";

/**
 * Super Admin pages capitalize every word (`.title-case`), but an email, a website address or a domain must be shown
 * exactly as stored: "Manish@Gmail.Com" or "Bharatorganicexpo.Com" is wrong. CSS cannot tell what a piece of text is, so
 * after React has drawn the page, every element whose own text holds an email, a URL or a domain gets `data-keep-case`
 * (CSS: `text-transform: none`). Only an attribute is added: no node is moved or wrapped, so React keeps working.
 */
const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i;
const URL_WITH_SCHEME = /\bhttps?:\/\/\S+/i;
const WWW = /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i;
const DOMAIN = /(?:^|[\s("'<])(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#]\S*)?(?=$|[\s),;"'>])/i;

/** A record id: capitalizing its groups ("A6577b9c-...-A17d-...") shows an id that does not exist. */
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/** A measurement ("2.6 s", "123 ms", "10:59 am"): capitalizing the unit gives "2.6 S", "123 Ms" (megasiemens) or "10:59 Am". */
const MEASUREMENT = /\d\s?(?:ms|s|am|pm|kb|mb|gb|tb|kbps|mbps|rps|rpm)\b/i;

/** True when the text holds an email, a URL (with or without scheme), a bare domain such as `acme.co.in`, a record id or a measurement. */
export function hasKeepCaseToken(text: string | null | undefined): boolean {
  if (!text || text.length < 4 || text.length > 4000) return false;
  return EMAIL.test(text) || URL_WITH_SCHEME.test(text) || WWW.test(text) || DOMAIN.test(text) || UUID.test(text) || MEASUREMENT.test(text);
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION"]);

function markTextNode(node: Node) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.hasAttribute("data-keep-case")) return;
  if (hasKeepCaseToken(node.nodeValue)) parent.setAttribute("data-keep-case", "");
}

/** Marks every element under `root` (or `root` itself, when it is a text node) whose own text needs its case kept. */
export function markKeepCase(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    markTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) markTextNode(node);
}

/** Keeps emails and website addresses in their own case inside `ref` as the page draws and changes. `resetKey` re-attaches when the element is re-created. */
export function useKeepCaseForEmailsAndUrls(ref: RefObject<HTMLElement | null>, resetKey?: unknown) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    markKeepCase(root);

    const pending = new Set<Node>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      for (const node of pending) if (node.isConnected) markKeepCase(node);
      pending.clear();
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") pending.add(record.target);
        else record.addedNodes.forEach((added) => pending.add(added));
      }
      if (!frame && pending.size) frame = requestAnimationFrame(flush);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, resetKey]);
}
