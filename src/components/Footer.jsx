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
    // Sin `mt-24`: el aire hasta el pie lo pone la última sección, con el mismo
    // ritmo que separa a todas las demás. Un margen propio acá lo duplicaba.
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
      {/* El zócalo de la isla flotante vive ACÁ, como padding del pie, y no
          como un `<div>` separado después de él: la isla es `fixed` y tapa el
          final del contenido, pero un separador suelto no tiene fondo y se lee
          como una franja vacía debajo del pie. Metido adentro, el mismo espacio
          queda cubierto por el fondo y el borde del pie.

          Solo en móvil y solo fuera del admin, por el mismo motivo que el
          separador anterior: `/catalogo/admin/login` cuelga de este Layout y
          ahí `NavFlotante` devuelve `null`, así que no hay isla que esquivar.

          ⚠️ `NavFlotante` también devuelve `null` en `/producto/:id`, y ese caso
          NO está contemplado acá — igual que no lo estaba en el separador que
          esto reemplaza. Son 96 px de más al pie de una ficha. Contemplarlo
          exige una segunda copia de la regla de "¿se ve la isla acá?", que hoy
          vive sola en `NavFlotante`; el día que haga falta, va un helper
          compartido, no un `startsWith` duplicado. */}
      <div
        className={`mx-auto flex w-full max-w-container-max flex-col items-center justify-between px-margin-mobile pt-8 md:flex-row md:px-margin-desktop md:pb-8 ${
          esAdmin ? "pb-8" : "pb-24"
        }`}
      >
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
