import type { Role } from "@/types";

const styles: Record<Role, string> = {
  OWNER: "bg-brand-50 text-brand-700 border-brand-100",
  EDITOR: "bg-emerald-50 text-emerald-700 border-emerald-100",
  VIEWER: "bg-amber-50 text-amber-700 border-amber-100",
};

const labels: Record<Role, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export function RoleBadge({ role, className = "" }: { role: Role; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 ${styles[role]} ${className}`}
    >
      {labels[role]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface text-mute border-line",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    brand: "bg-brand-50 text-brand-700 border-brand-100",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
