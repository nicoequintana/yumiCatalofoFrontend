/**
 * Centered-logo header, identical markup at every breakpoint.
 *
 * Per the finalized design decision there is no BottomNav anywhere and no
 * cart/favorite/account icons — this is the ONLY nav element the app renders
 * on `/` and `/producto/:id` (desktop). Ported from home.html L110-118 /
 * catalogo.html L108-119, unified into one element instead of the mockups'
 * `hidden md:flex` vs `sticky` split, since both markups are otherwise
 * identical.
 */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="mx-auto flex w-full max-w-container-max items-center justify-center px-margin-mobile py-6 md:px-margin-desktop">
        <span className="font-headline-lg text-headline-lg tracking-tighter text-primary">
          AURA PRESTIGIO
        </span>
      </div>
    </header>
  );
}

export default Navbar;
