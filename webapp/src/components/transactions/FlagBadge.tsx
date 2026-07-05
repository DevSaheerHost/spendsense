import type { FlagType } from "@/lib/types";

const FLAG_STYLES: Record<FlagType, { label: string; className: string }> = {
  green: { label: "Healthy", className: "bg-emerald-100 text-emerald-800" },
  yellow: { label: "Neutral", className: "bg-amber-100 text-amber-800" },
  red: { label: "Unhealthy", className: "bg-red-100 text-red-800" },
};

export function FlagBadge({ flag }: { flag: FlagType }) {
  const style = FLAG_STYLES[flag];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

export function FlagDot({ flag }: { flag: FlagType }) {
  const color = flag === "green" ? "bg-emerald-500" : flag === "yellow" ? "bg-amber-500" : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />;
}
