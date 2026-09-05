interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
}

// A console table (furniture) resting on two ruled ledger lines (accounting) — drawn in
// currentColor so it adapts to pine / paper / walnut wherever it's placed.
function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="8.5" width="24" height="3" rx="1.3" />
      <rect x="7" y="11.5" width="2.6" height="11" rx="1" />
      <rect x="22.4" y="11.5" width="2.6" height="11" rx="1" />
      <rect x="8" y="18.6" width="16" height="1.9" rx="0.95" opacity="0.8" />
      <rect x="4" y="25.4" width="24" height="1.5" rx="0.75" opacity="0.5" />
      <rect x="4" y="28.4" width="15" height="1.5" rx="0.75" opacity="0.3" />
    </svg>
  );
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "mark") {
    return <Mark className={`h-8 w-8 ${className}`} />;
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark className="h-7 w-7 shrink-0" />
      <span className="font-display text-[1.3rem] font-semibold leading-none tracking-tight">
        Urban Furniture
      </span>
    </span>
  );
}
