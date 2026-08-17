/**
 * Ported from home.html L203-213 / catalogo.html L213-223 (both markups are
 * equivalent: logo + copyright, border-top, responsive flex-col/row).
 */
function Footer() {
  return (
    <footer className="mt-24 w-full border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center justify-between px-margin-mobile py-12 md:flex-row md:px-margin-desktop">
        <div className="mb-6 md:mb-0">
          <span className="font-headline-md text-headline-md text-primary opacity-80 hover:opacity-100">
            YIMA
          </span>
        </div>
        <div>
          <span className="font-body-md text-body-md text-sm text-on-surface-variant">
            Todos los derechos reservados © 2026 | YIMA 
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
