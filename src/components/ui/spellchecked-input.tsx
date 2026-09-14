"use client";

import React, { useRef, useMemo, useLayoutEffect } from "react";
import { isWordValid } from "@/lib/spellcheck/spellcheck";
import { cn } from "@/lib/utils/cn";

interface SpellCheckedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue?: (val: string) => void;
  spellCheckEnabled?: boolean;
}

/**
 * An <input> that highlights misspelled words with a Gmail-style red wavy underline
 * strictly underneath the misspelled words using a synchronized backdrop layer.
 */
export function SpellCheckedInput({
  value = "",
  onChangeValue,
  onChange,
  spellCheckEnabled = true,
  className,
  disabled,
  style,
  ...props
}: SpellCheckedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll position between input and backdrop
  const syncScroll = () => {
    if (inputRef.current && backdropRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  useLayoutEffect(() => {
    syncScroll();
  }, [value]);

  // Generate tokens with red wavy underline for misspelled words
  const backdropElements = useMemo(() => {
    if (!value || !spellCheckEnabled || disabled) return null;

    // Split text into words, whitespace, and punctuation
    const tokens = value.split(/(\s+|[^\w\s]+)/);

    return tokens.map((token, idx) => {
      // Check if token contains letter characters
      const hasLetters = /[a-zA-Z]/.test(token);
      const isTypo = hasLetters && !isWordValid(token);

      if (isTypo) {
        return (
          <span
            key={idx}
            className="spell-typo-underline"
            style={{
              color: "transparent",
              textDecoration: "underline wavy #ea4335",
              textDecorationColor: "#ea4335",
              textUnderlineOffset: "3px",
              textDecorationThickness: "1.5px",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3'%3E%3Cpath d='M0 2.2 Q 1.5 0.5, 3 2.2 T 6 2.2' fill='none' stroke='%23ea4335' stroke-width='0.9'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "bottom",
              backgroundSize: "6px 3px",
              paddingBottom: "2px",
            }}
          >
            {token}
          </span>
        );
      }

      return (
        <span key={idx} style={{ color: "transparent" }}>
          {token}
        </span>
      );
    });
  }, [value, spellCheckEnabled, disabled]);

  return (
    <div className="relative flex-1 min-w-0 flex items-center">
      {/* Synchronized Underline Backdrop Layer */}
      {spellCheckEnabled && value && (
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center whitespace-pre select-none overflow-hidden bg-transparent font-[inherit] leading-[inherit] tracking-[inherit]",
            className
          )}
          style={{
            ...style,
            color: "transparent",
            background: "transparent",
            border: "none",
          }}
        >
          {backdropElements}
        </div>
      )}

      {/* Real Interactive Input */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          onChangeValue?.(e.target.value);
        }}
        onScroll={syncScroll}
        onKeyUp={syncScroll}
        onKeyDown={syncScroll}
        onSelect={syncScroll}
        disabled={disabled}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className={cn(
          "relative z-10 w-full min-w-0 bg-transparent outline-none",
          className
        )}
        style={style}
        {...props}
      />
    </div>
  );
}

interface SpellCheckedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeValue?: (val: string) => void;
  spellCheckEnabled?: boolean;
}

/**
 * A <textarea> that highlights misspelled words with a Gmail-style red wavy underline
 */
export function SpellCheckedTextarea({
  value = "",
  onChangeValue,
  onChange,
  spellCheckEnabled = true,
  className,
  disabled,
  style,
  rows = 3,
  ...props
}: SpellCheckedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useLayoutEffect(() => {
    syncScroll();
  }, [value]);

  const backdropElements = useMemo(() => {
    if (!value || !spellCheckEnabled || disabled) return null;

    const tokens = value.split(/(\s+|[^\w\s]+)/);

    return tokens.map((token, idx) => {
      const hasLetters = /[a-zA-Z]/.test(token);
      const isTypo = hasLetters && !isWordValid(token);

      if (isTypo) {
        return (
          <span
            key={idx}
            className="spell-typo-underline"
            style={{
              color: "transparent",
              textDecoration: "underline wavy #ea4335",
              textDecorationColor: "#ea4335",
              textUnderlineOffset: "3px",
              textDecorationThickness: "1.5px",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3'%3E%3Cpath d='M0 2.2 Q 1.5 0.5, 3 2.2 T 6 2.2' fill='none' stroke='%23ea4335' stroke-width='0.9'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "bottom",
              backgroundSize: "6px 3px",
              paddingBottom: "2px",
            }}
          >
            {token}
          </span>
        );
      }

      return (
        <span key={idx} style={{ color: "transparent" }}>
          {token}
        </span>
      );
    });
  }, [value, spellCheckEnabled, disabled]);

  return (
    <div className="relative w-full">
      {/* Backdrop */}
      {spellCheckEnabled && value && (
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 whitespace-pre-wrap break-words select-none overflow-hidden bg-transparent font-[inherit] leading-[inherit] tracking-[inherit]",
            className
          )}
          style={{
            ...style,
            color: "transparent",
            background: "transparent",
            border: "none",
          }}
        >
          {backdropElements}
        </div>
      )}

      {/* Real Interactive Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          onChangeValue?.(e.target.value);
        }}
        onScroll={syncScroll}
        onKeyUp={syncScroll}
        onKeyDown={syncScroll}
        onSelect={syncScroll}
        rows={rows}
        disabled={disabled}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className={cn(
          "relative z-10 w-full resize-none bg-transparent outline-none",
          className
        )}
        style={style}
        {...props}
      />
    </div>
  );
}
