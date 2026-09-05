import { Link, useLocation } from "react-router-dom";
import PanelCategorias from "./PanelCategorias.jsx";
import useBloquearScroll from "../hooks/useBloquearScroll.js";
import useCategoriasNavbar from "../hooks/useCategoriasNavbar.js";
import useDialogo from "../hooks/useDialogo.js";

/**
 * El menú del catálogo en celular.
 *
 * SUBE DESDE ABAJO, no baja desde arriba: el disparador es la isla flotante, y
 * un panel que se despliega desde el header con el botón en el pie es el gesto
 * peleándose con el resultado.
 *
 * Es una superficie modal de verdad —vela la página—, así que le corresponde la
 * semántica completa de diálogo: `useDialogo` da foco inicial, trampa de foco,
 * Escape y devolución del foco al botón que la abrió, y `useBloquearScroll`
 * frena la página de atrás, que está tapada.
 *
 * **Se MONTA solo mientras está abierta**, en vez de quedar oculta con `hidden`.
 * Además de ser lo correcto para el foco, evita duplicar destinos en el DOM: con
 * las dos copias montadas, cualquier consulta por rol o texto encontraría dos
 * nodos para el mismo link, y los tests de contrato de carrito y favoritos usan
 * `getByRole` singular.
 *
 * Las categorías van anidadas y SIN acordeón: la hoja scrollea, y un acordeón
 * sería un toque extra para esconder ocho links.
 */

const CLASE_FILA =
  "flex min-h-12 items-center gap-3 border-b border-outline-variant py-3 font-body-lg text-body-lg text-on-surface";

export default function HojaMenu({ abierta, onCerrar }) {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const hojaRef = useDialogo({ abierto: abierta, onCerrar });
  const { categorias } = useCategoriasNavbar();

  useBloquearScroll(abierta);

  // Mismo guard que `NavFlotante`: `/catalogo/admin/login` cuelga de este
  // mismo `Layout` público, y sin este chequeo la hoja se montaría encima de
  // esa pantalla de login.
  if (esAdmin || !abierta) return null;

  return (
    <>
      {/* El velo es HERMANO de la hoja y no su padre: un ancestro con
          `backdrop-filter` se vuelve bloque contenedor de sus descendientes
          `fixed` y les rompe el posicionamiento. Ya está documentado en
          `Navbar.jsx` y en `VeloModal.jsx`; acá aplica igual. */}
      <div
        className="fixed inset-0 z-40 bg-inverse-surface opacity-20 md:hidden"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div
        id="hoja-menu"
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-outline-variant bg-background px-margin-mobile pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 outline-none md:hidden"
      >
        {/* El agarre: la señal de que esto se puede arrastrar hacia abajo. Es
            decorativo — cerrar se hace con el botón, con Escape o tocando el
            velo. */}
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant" />

        <Link to="/" onClick={onCerrar} className={CLASE_FILA}>
          <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
            home
          </span>
          Inicio
        </Link>

        <p className="font-label-sm text-label-sm mt-5 px-3 uppercase text-on-surface-variant">
          Productos
        </p>
        <PanelCategorias categorias={categorias} onNavegar={onCerrar} />

        <Link to="/favoritos" onClick={onCerrar} className={`${CLASE_FILA} mt-5 border-t`}>
          <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
            favorite
          </span>
          Favoritos
        </Link>
      </div>
    </>
  );
}
