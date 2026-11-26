"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ApiClientError, api } from "@/lib/api-client";
import type { PublicUser, ShareItem, ShareRoleValue } from "@/types";

type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSharesChanged?: () => void;
};

export function ShareDialog({ open, onClose, documentId, onSharesChanged }: ShareDialogProps) {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRoleValue>("VIEWER");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shareResponse, userResponse] = await Promise.all([
        api.get<{ shares: ShareItem[] }>(`/api/documents/${documentId}/shares`),
        api.get<{ users: PublicUser[] }>("/api/users"),
      ]);
      setShares(shareResponse.shares);
      setPeople(userResponse.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load collaborators.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void load();
  }, [open, load]);

  const addShare = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { share } = await api.post<{ share: ShareItem }>(
        `/api/documents/${documentId}/shares`,
        { email: trimmed, role }
      );
      setShares((current) => {
        const rest = current.filter((item) => item.userId !== share.userId);
        return [...rest, share].sort((a, b) => a.name.localeCompare(b.name));
      });
      setEmail("");
      toast.success(`${share.email} can now ${role === "VIEWER" ? "view" : "edit"}.`);
      onSharesChanged?.();
    } catch (shareError) {
      setError(
        shareError instanceof ApiClientError ? shareError.message : "Could not share the document."
      );
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, nextRole: ShareRoleValue) => {
    const previous = shares;
    setShares((current) =>
      current.map((item) => (item.userId === userId ? { ...item, role: nextRole } : item))
    );
    try {
      await api.patch(`/api/documents/${documentId}/shares/${userId}`, { role: nextRole });
      toast.success("Role updated.");
      onSharesChanged?.();
    } catch (roleError) {
      setShares(previous);
      setError(roleError instanceof Error ? roleError.message : "Could not change that role.");
    }
  };

  const removeShare = async (userId: string) => {
    const previous = shares;
    setShares((current) => current.filter((item) => item.userId !== userId));
    try {
      await api.delete(`/api/documents/${documentId}/shares/${userId}`);
      toast.success("Access removed.");
      onSharesChanged?.();
    } catch (removeError) {
      setShares(previous);
      setError(removeError instanceof Error ? removeError.message : "Could not remove that person.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share document"
      description="Invite a demo user by email and choose what they can do."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              list="docket-people"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addShare();
              }}
              placeholder="name@demo.test"
              aria-label="Email address to share with"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-mute/70"
            />
            <datalist id="docket-people">
              {people.map((person) => (
                <option key={person.id} value={person.email}>
                  {person.name}
                </option>
              ))}
            </datalist>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as ShareRoleValue)}
              aria-label="Role for the invited user"
              className="h-10 rounded-lg border border-line bg-white px-2 text-sm text-ink"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
            <Button type="button" onClick={() => void addShare()} loading={busy}>
              <UserPlus className="h-4 w-4" aria-hidden />
              Share
            </Button>
          </div>
          {error ? (
            <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mute">
            People with access
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-mute">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading collaborators…
            </div>
          ) : shares.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-mute">
              Only you have access right now.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {shares.map((share) => (
                <li key={share.userId} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{share.name}</p>
                    <p className="truncate text-xs text-mute">{share.email}</p>
                  </div>
                  <select
                    value={share.role}
                    aria-label={`Role for ${share.name}`}
                    onChange={(event) =>
                      void changeRole(share.userId, event.target.value as ShareRoleValue)
                    }
                    className="h-8 rounded-md border border-line bg-white px-2 text-[13px] text-ink"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void removeShare(share.userId)}
                    aria-label={`Remove ${share.name}`}
                    className="rounded-md p-1.5 text-mute transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
