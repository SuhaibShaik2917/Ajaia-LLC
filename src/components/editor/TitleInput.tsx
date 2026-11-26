"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

type TitleInputProps = {
  title: string;
  editable: boolean;
  onCommit: (title: string) => void;
};

/** Borderless document title. Enter or blur commits; Escape reverts. */
export function TitleInput({ title, editable, onCommit }: TitleInputProps) {
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(title);
      return;
    }
    if (trimmed !== title) onCommit(trimmed);
  };

  return (
    <input
      ref={inputRef}
      value={value}
      readOnly={!editable}
      maxLength={MAX_TITLE_LENGTH}
      aria-label="Document title"
      placeholder="Untitled document"
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          inputRef.current?.blur();
        }
        if (event.key === "Escape") {
          setValue(title);
          inputRef.current?.blur();
        }
      }}
      className={`w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-1 py-1 text-[15px] font-medium text-ink transition-colors ${
        editable ? "hover:border-line focus:border-line focus:bg-white" : "cursor-default"
      }`}
    />
  );
}
