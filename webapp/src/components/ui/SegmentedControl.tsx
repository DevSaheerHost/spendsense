"use client";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

// Material 3 segmented button group: a rounded, outlined container whose
// selected segment gets a tonal fill and a leading checkmark.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex overflow-hidden rounded-full border border-slate-300"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors ${
              index > 0 ? "border-l border-slate-300" : ""
            }`}
            style={
              selected
                ? { backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }
                : { color: "#64748b" }
            }
          >
            {selected && (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
