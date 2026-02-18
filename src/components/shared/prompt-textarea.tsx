"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { usePromptHistory } from "@/hooks/use-prompt-history";
import { Clock, X } from "lucide-react";

interface PromptTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

interface DropdownStyle {
  position: "fixed";
  top: number;
  left: number;
  width: number;
  zIndex: number;
}

export function PromptTextarea({ value, onChange, placeholder, className }: PromptTextareaProps) {
  const { history, savePrompt, deletePrompt } = usePromptHistory();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle>({
    position: "fixed",
    top: 0,
    left: 0,
    width: 0,
    zIndex: 9999,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setMounted(true), []);

  const filtered = history.filter(
    (p) => !value.trim() || p.toLowerCase().includes(value.toLowerCase())
  );

  function handleFocus() {
    if (textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownMaxH = 208; // max-h-52 = 13rem ≈ 208px
      const top =
        spaceBelow >= dropdownMaxH + 4
          ? rect.bottom + 4
          : rect.top - dropdownMaxH - 4;
      setDropdownStyle({
        position: "fixed",
        top,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(true);
  }

  function handleBlur() {
    // Delay so mousedown on suggestion fires before blur hides dropdown
    setTimeout(() => {
      setOpen(false);
      savePrompt(value);
    }, 160);
  }

  return (
    <>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />

      {mounted && open && filtered.length > 0 &&
        createPortal(
          <div
            style={dropdownStyle}
            className="rounded-md border border-border bg-popover shadow-md overflow-hidden max-h-52 overflow-y-auto"
          >
            <div className="px-2.5 py-1.5 border-b border-border">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Saved prompts
              </span>
            </div>
            {filtered.map((p) => (
              <div
                key={p}
                className="flex items-start gap-2 px-2.5 py-2 hover:bg-accent group"
              >
                <Clock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                <span
                  className="text-xs text-foreground flex-1 line-clamp-2 cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(p);
                    setOpen(false);
                  }}
                >
                  {p}
                </span>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    deletePrompt(p);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Remove saved prompt"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
