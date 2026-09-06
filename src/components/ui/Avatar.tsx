// Avatar / thumbnail. Renders a real image if one is present (models carry imageUrl), otherwise a
// calm fallback — a name monogram for people, or a box glyph for products. No fabricated image.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg" };
const SHAPES = { circle: "rounded-full", square: "rounded-md" };

export function Avatar({
  name,
  imageUrl,
  size = "sm",
  shape = "circle",
  fallback = "initials",
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof SIZES;
  shape?: keyof typeof SHAPES;
  fallback?: "initials" | "box";
}) {
  const shapeClass = SHAPES[shape];
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`${SIZES[size]} ${shapeClass} shrink-0 bg-line/40 object-cover`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} ${shapeClass} inline-flex shrink-0 items-center justify-center bg-pine/8 font-medium text-pine`}
    >
      {fallback === "box" ? (
        <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z M3 7l9 4 9-4 M12 11v10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ) : (
        initials(name)
      )}
    </span>
  );
}
