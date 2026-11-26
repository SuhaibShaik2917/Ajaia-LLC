"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Files, LogOut, Plus, Share2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api-client";
import type { SessionUser } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type SidebarProps = {
  user: SessionUser;
  onNavigate?: () => void;
  onClose?: () => void;
};

export function Sidebar({ user, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { openImport, createDocument, creating } = useAppShell();
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);

  const view = searchParams.get("view") === "shared" ? "shared" : "owned";
  const isDashboard = pathname === "/";

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            D
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Docket</span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-mute hover:bg-surface hover:text-ink lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="space-y-2 px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void createDocument();
          }}
          disabled={creating}
          className="flex w-full items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New document
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            openImport();
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Import file
        </button>
      </div>

      <nav aria-label="Documents" className="mt-5 space-y-0.5 px-2">
        <Link
          href="/?view=owned"
          onClick={onNavigate}
          aria-current={isDashboard && view === "owned" ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            isDashboard && view === "owned"
              ? "bg-surface font-medium text-ink"
              : "text-mute hover:bg-surface hover:text-ink"
          }`}
        >
          <Files className="h-4 w-4" aria-hidden />
          My documents
        </Link>
        <Link
          href="/?view=shared"
          onClick={onNavigate}
          aria-current={isDashboard && view === "shared" ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            isDashboard && view === "shared"
              ? "bg-surface font-medium text-ink"
              : "text-mute hover:bg-surface hover:text-ink"
          }`}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Shared with me
        </Link>
      </nav>

      <div className="mt-auto border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-mute">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-mute transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
