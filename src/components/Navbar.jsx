import { Link, useLocation } from "react-router-dom";

/**
 * Centered-logo header, identical markup at every breakpoint.
 *
 * A favorites heart link was added per the favorites feature (design item:
 * Feature 4 of the 6-feature batch), positioned absolutely so the centered
 * logo layout is preserved. No count badge (removed by explicit request —
 * the heart just links to /favoritos, it doesn't show how many are saved).
 * Favorites is a public-catalog-only feature (finalized decision) — the
 * Navbar is shared by admin routes too (via the same Layout), so the heart
 * is hidden on `/catalogo/admin/*`. Ported from home.html L110-118 /
 * catalogo.html L108-119, unified into one element instead of the mockups'
 * `hidden md:flex` vs `sticky` split, since both markups are otherwise
 * identical.
 */
function Navbar() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow">
      <div className="relative mx-auto flex w-full max-w-container-max items-center justify-center px-margin-mobile py-6 md:px-margin-desktop">
        <span className="font-headline-lg text-headline-lg tracking-tighter text-primary">
          YIMA
        </span>
        {esAdmin ? null : (
          <Link
            to="/favoritos"
            aria-label="Ver favoritos"
            className="absolute right-margin-mobile flex items-center gap-1 text-on-surface-variant hover:text-error md:right-margin-desktop"
          >
            <span className="material-symbols-outlined text-[22px]">favorite</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
