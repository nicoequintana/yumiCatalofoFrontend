/**
 * Small inline loading spinner (design item 6) — pure CSS via Tailwind's
 * built-in animate-spin, no external animation library. This is a
 * functional loading indicator, not a decorative hover/idle animation, so
 * it's exempt from the "remove animations" cleanup in item 4.
 */
function Spinner({ className = "h-5 w-5" }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export default Spinner;
