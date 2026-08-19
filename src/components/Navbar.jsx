import { Link, useLocation } from "react-router-dom";
import useCarrito from "../hooks/useCarrito.js";

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
 *
 * A cart icon+link was added per Sprint 5 ("Carrito frontend"), positioned
 * to the left of the favorites heart. Unlike favorites, the cart DOES show a
 * numeric badge (`useCarrito()`'s `cantidadTotal`) — a deliberate, confirmed
 * asymmetry between the two features, not an inconsistency to fix. The badge
 * only renders when `cantidadTotal > 0` (no "0" badge noise). Same
 * admin-route hiding as the favorites heart.
 */
function Navbar() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const { cantidadTotal } = useCarrito();

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow">
      <div className="relative mx-auto flex w-full max-w-container-max items-center justify-center px-margin-mobile py-6 md:px-margin-desktop">
        <Link
          to="/"
          className="font-headline-lg text-headline-lg tracking-tighter text-primary"
        >
          YIMA
        </Link>
        {esAdmin ? null : (
          <div className="absolute right-margin-mobile flex items-center gap-4 md:right-margin-desktop">
            <Link
              to="/carrito"
              aria-label="Ver carrito"
              className="relative flex items-center gap-1 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
              {cantidadTotal > 0 ? (
                <span className="font-label-sm text-label-sm absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-on-primary">
                  {cantidadTotal}
                </span>
              ) : null}
            </Link>
            <Link
              to="/favoritos"
              aria-label="Ver favoritos"
              className="flex items-center gap-1 text-on-surface-variant hover:text-error"
            >
              <span className="material-symbols-outlined text-[22px]">favorite</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
