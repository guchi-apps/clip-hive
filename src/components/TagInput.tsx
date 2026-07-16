"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TagDTO } from "@/types";

export function TagInput({
  id,
  value,
  onChange,
  suggestions,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (names: string[]) => void;
  suggestions: TagDTO[];
  className?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = inputValue.trim();
  const filteredSuggestions = suggestions
    .filter((tag) => !value.includes(tag.name))
    .filter((tag) => trimmed === "" || tag.name.toLowerCase().includes(trimmed.toLowerCase()));

  function addTag(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!value.some((v) => v.toLowerCase() === trimmedName.toLowerCase())) {
      onChange([...value, trimmedName]);
    }
    setInputValue("");
  }

  function removeTag(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      return;
    }
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-input py-1 transition-colors focus-within:border-b-2 focus-within:border-ring">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {name}
            <button
              type="button"
              onClick={() => removeTag(name)}
              aria-label={`${name} を削除`}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
          }}
          placeholder={value.length === 0 ? "タグを入力してEnter" : ""}
          className="min-w-24 flex-1 bg-transparent px-0 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full min-w-48 overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {filteredSuggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(tag.name)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
