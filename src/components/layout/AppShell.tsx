"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ImportDialog } from "@/components/import/ImportDialog";
import { api } from "@/lib/api-client";
import type { DocSummary, SessionUser } from "@/types";

type AppShellContextValue = {
  user: SessionUser;
  openImport: () => void;
  createDocument: () => Promise<void>;
  creating: boolean;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const value = useContext(AppShellContext);
  if (!value) throw new Error("useAppShell must be used inside <AppShell>");
  return value;
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const createDocument = useCallback(async () => {
    setCreating(true);
    try {
      const { document } = await api.post<{ document: DocSummary }>("/api/documents", {});
      router.push(`/documents/${document.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the document.");
    } finally {
      setCreating(false);
    }
  }, [router]);

  const value = useMemo<AppShellContextValue>(
    () => ({ user, openImport: () => setImportOpen(true), createDocument, creating }),
    [user, createDocument, creating]
  );

  return (
    <AppShellContext.Provider value={value}>
      <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-line bg-white lg:block">
          <Sidebar user={user} />
        </aside>

        <div className="min-w-0">
          <MobileNav onOpenDrawer={() => setDrawerOpen(true)} />
          <main className="min-w-0">{children}</main>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="relative h-full w-[280px] max-w-[85vw] bg-white shadow-xl">
              <Sidebar user={user} onNavigate={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    </AppShellContext.Provider>
  );
}
