"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link2, Unlink, Undo, Redo,
  RemoveFormatting, Smile, SpellCheck
} from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import {
  applySpellMarksToHtml,
  cleanSpellMarks
} from "@/lib/spellcheck/spellcheck";

// Dynamic import of EmojiPicker to avoid any SSR evaluation
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-xs text-gray-400">Loading emojis...</div>,
});

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  spellCheck?: boolean;
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Start writing...",
  className = "",
  minHeight = "150px",
  spellCheck = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerBtnRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);

  // Apply Gmail-style wavy red underlines to errors inside editor
  const applyVisualUnderlines = useCallback(() => {
    if (!editorRef.current || !spellCheckEnabled || !spellCheck) return;
    const currentHtml = editorRef.current.innerHTML;
    const markedHtml = applySpellMarksToHtml(currentHtml);
    if (markedHtml !== currentHtml) {
      editorRef.current.innerHTML = markedHtml;
    }
  }, [spellCheckEnabled, spellCheck]);

  const checkActiveStates = useCallback(() => {
    const commands = [
      "bold", "italic", "underline", "strikeThrough",
      "insertUnorderedList", "insertOrderedList",
      "justifyLeft", "justifyCenter", "justifyRight"
    ];
    const newStates: Record<string, boolean> = {};
    commands.forEach((cmd) => {
      try {
        newStates[cmd] = document.queryCommandState(cmd);
      } catch {
        newStates[cmd] = false;
      }
    });
    setActiveStates(newStates);
  }, []);

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) {
      saveCurrentSelection();
      if (emojiPickerBtnRef.current) {
        const rect = emojiPickerBtnRef.current.getBoundingClientRect();
        const pickerHeight = 330;
        const pickerWidth = 310;
        const spaceBelow = window.innerHeight - rect.bottom;
        const top =
          spaceBelow >= pickerHeight + 10
            ? rect.bottom + 6
            : Math.max(10, rect.top - pickerHeight - 6);
        const left = Math.max(10, Math.min(rect.left, window.innerWidth - pickerWidth - 16));
        setPickerPos({ top, left });
      }
      setShowEmojiPicker(true);
    } else {
      setShowEmojiPicker(false);
    }
  };

  // Close emoji picker when clicking outside or reposition on scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        emojiPickerBtnRef.current &&
        !emojiPickerBtnRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleScrollOrResize = () => {
      if (showEmojiPicker && emojiPickerBtnRef.current) {
        const rect = emojiPickerBtnRef.current.getBoundingClientRect();
        const pickerHeight = 330;
        const pickerWidth = 310;
        const spaceBelow = window.innerHeight - rect.bottom;
        const top =
          spaceBelow >= pickerHeight + 10
            ? rect.bottom + 6
            : Math.max(10, rect.top - pickerHeight - 6);
        const left = Math.max(10, Math.min(rect.left, window.innerWidth - pickerWidth - 16));
        setPickerPos({ top, left });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (editor.contains(document.activeElement) || editor === document.activeElement) {
        checkActiveStates();
        saveCurrentSelection();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    editor.addEventListener("keyup", handleSelectionChange);
    editor.addEventListener("mouseup", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      editor.removeEventListener("keyup", handleSelectionChange);
      editor.removeEventListener("mouseup", handleSelectionChange);
    };
  }, [checkActiveStates]);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const cleanVal = cleanSpellMarks(value);
      const editorClean = cleanSpellMarks(editorRef.current.innerHTML);
      if (cleanVal !== editorClean) {
        editorRef.current.innerHTML = spellCheckEnabled ? applySpellMarksToHtml(cleanVal) : cleanVal;
      }
    }
  }, [value, spellCheckEnabled]);

  const formatText = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleChange();
    checkActiveStates();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (url) {
      document.execCommand("createLink", false, url);
    }
    editorRef.current?.focus();
    handleChange();
  };

  const handleChange = () => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const cleanHtml = cleanSpellMarks(currentHtml);
      onChange?.(cleanHtml);

      // Debounce applying visual red wavy underlines so typing remains fast & smooth
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        applyVisualUnderlines();
      }, 700);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    editorRef.current?.focus();
    restoreSelection();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(emojiData.emoji);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    } else {
      document.execCommand("insertText", false, emojiData.emoji);
    }

    handleChange();
  };

  const ToolBtn = ({
    onClick,
    children,
    title,
    command,
    active
  }: {
    onClick: () => void;
    children: React.ReactNode;
    title: string;
    command?: string;
    active?: boolean;
  }) => {
    const isActive = active !== undefined ? active : (command ? activeStates[command] : false);
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
        className={`flex h-7 min-w-7 items-center justify-center rounded-sm transition-colors ${isActive
          ? "bg-blue-100 text-blue-600 shadow-inner"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
      >
        {children}
      </button>
    );
  };

  const Divider = () => <div className="mx-1 h-5 w-px bg-gray-200" />;

  return (
    <div className={`relative rounded-sm border border-gray-200 bg-white ${className}`}>
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/50 px-2 py-1.5">
        <select
          defaultValue="p"
          onChange={(e) => formatText("formatBlock", e.target.value)}
          className="h-7 rounded-sm border border-gray-200 bg-white px-1.5 text-[11px] text-gray-600 outline-none"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <Divider />
        <ToolBtn onClick={() => formatText("bold")} title="Bold" command="bold"><Bold size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("italic")} title="Italic" command="italic"><Italic size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("underline")} title="Underline" command="underline"><Underline size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("strikeThrough")} title="Strikethrough" command="strikeThrough"><Strikethrough size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => formatText("insertUnorderedList")} title="Bullet List" command="insertUnorderedList"><List size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("insertOrderedList")} title="Numbered List" command="insertOrderedList"><ListOrdered size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => formatText("justifyLeft")} title="Align Left" command="justifyLeft"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("justifyCenter")} title="Align Center" command="justifyCenter"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("justifyRight")} title="Align Right" command="justifyRight"><AlignRight size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={addLink} title="Add Link"><Link2 size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("unlink")} title="Remove Link"><Unlink size={14} /></ToolBtn>
        <Divider />

        {/* Emoji Picker Button */}
        <div className="relative" ref={emojiPickerBtnRef}>
          <ToolBtn
            onClick={toggleEmojiPicker}
            title="Emoji Picker"
            active={showEmojiPicker}
          >
            <Smile size={14} className={showEmojiPicker ? "text-amber-500" : ""} />
          </ToolBtn>

          {showEmojiPicker && pickerPos && typeof document !== "undefined" && createPortal(
            <div
              ref={emojiPickerRef}
              style={{
                position: "fixed",
                top: `${pickerPos.top}px`,
                left: `${pickerPos.left}px`,
                zIndex: 999999,
              }}
              className="shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm border border-gray-200 bg-white overflow-hidden"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                searchPlaceHolder="Search emoji..."
                width={300}
                height={330}
                previewConfig={{ showPreview: false }}
              />
            </div>,
            document.body
          )}
        </div>

        {/* Spell Check Toggle */}
        <ToolBtn
          onClick={() => {
            const next = !spellCheckEnabled;
            setSpellCheckEnabled(next);
            if (next) {
              applyVisualUnderlines();
            } else if (editorRef.current) {
              editorRef.current.innerHTML = cleanSpellMarks(editorRef.current.innerHTML);
            }
          }}
          title={spellCheckEnabled ? "Spell Checker: Active" : "Spell Checker: Disabled"}
          active={spellCheckEnabled}
        >
          <SpellCheck size={14} className={spellCheckEnabled ? "text-emerald-600" : "text-gray-400"} />
        </ToolBtn>

        <Divider />
        <ToolBtn onClick={() => formatText("undo")} title="Undo"><Undo size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("redo")} title="Redo"><Redo size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("removeFormat")} title="Clear Formatting"><RemoveFormatting size={14} /></ToolBtn>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onInput={handleChange}
        onClick={checkActiveStates}
        data-placeholder={placeholder}
        className="rich-editor min-h-[100px] px-3 py-2 text-[12px] leading-relaxed text-gray-800 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight }}
      />
    </div>
  );
}
