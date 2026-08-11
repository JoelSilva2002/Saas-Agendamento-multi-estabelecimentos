import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function SelectableCard({
  selected,
  onSelect,
  title,
  subtitle,
  trailing,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
        "min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
      )}
    >
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {selected && <Check className="size-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </button>
  );
}
