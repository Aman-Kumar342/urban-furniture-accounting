import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

// Native select styled to match Input, with a custom chevron so it reads as part of the kit.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className = "", children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`h-11 w-full appearance-none rounded-md border bg-surface pl-3 pr-9 text-sm text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
          invalid ? "border-oxblood" : "border-line focus-visible:border-pine"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
