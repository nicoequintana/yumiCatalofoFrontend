import { useLocation } from "react-router-dom";
import LogoYima from "./LogoYima.jsx";
import useContextoComercial from "../hooks/useContextoComercial.js";

/**
 * Ported from home.html L203-213 / catalogo.html L213-223 (both markups are
 * equivalent: logo + copyright, border-top, responsive flex-col/row).
 *
 * El wordmark de la izquierda es el logo; el "YIMA" de la línea de copyright
 * queda como texto porque ahí la marca es una palabra dentro de una oración,
 * no una firma visual.
 *
 * DOODLE. El pie lleva el mismo arte que el encabezado, y con la MISMA regla:
 * cuál de los dos Doodles aplica lo decide la superficie, porque el panel y el
 * catálogo son públicos distintos y una campaña puede querer marca festiva en
 * uno y no en el otro (ver `Navbar.jsx`). Sin esa simetría,
 * `/catalogo/admin/login` —que usa este mismo Layout— mostraría dos artes
 * distintos en la misma pantalla, y eso se lee como una imagen que no cargó.
 */
function Footer() {
  const { pathname } = useLocation();
  const { doodle, doodleAdmin } = useContextoComercial();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const doodleDelPie = (esAdmin ? doodleAdmin : doodle)?.url ?? null;

  return (
    <footer className="mt-24 w-full border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center justify-between px-margin-mobile py-8 md:flex-row md:px-margin-desktop">
        <div className="mb-6 md:mb-0">
          <LogoYima
            className="h-8 opacity-80 transition-opacity hover:opacity-100"
            doodleUrl={doodleDelPie}
          />
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
