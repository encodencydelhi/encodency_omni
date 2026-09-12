"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Unlink, Undo, Redo, RemoveFormatting } from "lucide-react";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value = "", onChange, placeholder = "Start writing...", className = "", minHeight = "150px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});

  const checkActiveStates = useCallback(() => {
    const commands = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList", "justifyLeft", "justifyCenter", "justifyRight"];
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

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (editor.contains(document.activeElement) || editor === document.activeElement) {
        checkActiveStates();
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
    if (editorRef.current && value !== undefined && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

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
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const ToolBtn = ({ onClick, children, title, command }: { onClick: () => void; children: React.ReactNode; title: string; command?: string }) => {
    const isActive = command ? activeStates[command] : false;
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
        className={`flex h-7 min-w-7 items-center justify-center rounded-md transition-colors ${
          isActive
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
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/50 px-2 py-1.5">
        <select defaultValue="p" onChange={(e) => formatText("formatBlock", e.target.value)} className="h-7 rounded-md border border-gray-200 bg-white px-1.5 text-[11px] text-gray-600 outline-none">
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
        <ToolBtn onClick={() => formatText("undo")} title="Undo"><Undo size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("redo")} title="Redo"><Redo size={14} /></ToolBtn>
        <ToolBtn onClick={() => formatText("removeFormat")} title="Clear Formatting"><RemoveFormatting size={14} /></ToolBtn>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleChange}
        onClick={checkActiveStates}
        data-placeholder={placeholder}
        className="rich-editor min-h-[100px] px-3 py-2 text-[12px] leading-relaxed text-gray-800 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight }}
      />
    </div>
  );
}
