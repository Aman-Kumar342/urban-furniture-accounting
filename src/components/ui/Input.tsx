import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`h-11 w-full rounded-md border bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
        invalid ? "border-oxblood" : "border-line focus-visible:border-pine"
      } ${className}`}
      {...rest}
    />
  );
});
