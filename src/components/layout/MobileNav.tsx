"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";

export function MobileNav({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { createDocument, creating } = useAppShell();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation"
          className="rounded-md p-2 text-mute hover:bg-surface hover:text-ink"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
            D
          </span>
          <span className="text-sm font-semibold tracking-tight">Docket</span>
        </Link>
      </div>
      <button
        type="button"
        onClick={() => void createDocument()}
        disabled={creating}
        aria-label="New document"
        className="rounded-md p-2 text-brand-600 hover:bg-brand-50 disabled:opacity-50"
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>
    </header>
  );
}
