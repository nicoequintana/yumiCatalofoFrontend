import { Link } from "react-router-dom";
import useFavoritos from "../hooks/useFavoritos.js";

/**
 * Centered-logo header, identical markup at every breakpoint.
 *
 * A favorites heart + count link was added per the favorites feature
 * (design item: Feature 4 of the 6-feature batch) — this is now the one
 * nav icon this app renders, positioned absolutely so the centered logo
 * layout is preserved. Ported from home.html L110-118 / catalogo.html
 * L108-119, unified into one element instead of the mockups' `hidden
 * md:flex` vs `sticky` split, since both markups are otherwise identical.
 */
function Navbar() {
  const { favoritos } = useFavoritos();

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="relative mx-auto flex w-full max-w-container-max items-center justify-center px-margin-mobile py-6 md:px-margin-desktop">
        <span className="font-headline-lg text-headline-lg tracking-tighter text-primary">
          AURA PRESTIGIO
        </span>
        <Link
          to="/favoritos"
          aria-label="Ver favoritos"
          className="absolute right-margin-mobile flex items-center gap-1 text-on-surface-variant hover:text-error md:right-margin-desktop"
        >
          <span className="material-symbols-outlined text-[22px]">favorite</span>
          {favoritos.length > 0 ? (
            <span className="font-label-sm text-label-sm text-on-surface-variant">{favoritos.length}</span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
