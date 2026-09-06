import { Link, useLocation } from "react-router-dom";
import PanelCategorias from "./PanelCategorias.jsx";
import useBloquearScroll from "../hooks/useBloquearScroll.js";
import useCarrito from "../hooks/useCarrito.js";
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
 *
 * **Carrito y Buscar se sumaron el 05/09/2026.** ⚠️ Este comentario decía que
 * en la ficha de producto "el header entero se esconde por debajo de `md`"
 * mediante un `esFichaProducto` de `Navbar.jsx`: **ni esa variable ni ese guard
 * existen**, y esconder la barra en la ficha ya se probó y salió mal (dejó la
 * pantalla sin carrito). El `Navbar` se muestra en TODAS las rutas públicas.
 * Lo que sí devuelve `null` en `/producto/` es `NavFlotante`, así que en la
 * ficha esta hoja no se puede abrir — y las filas de Carrito y Buscar valen
 * igual, por el resto de las rutas móviles.
 *
 * **Sus nombres accesibles NO copian los del header** (`Ver carrito`, `Buscar
 * productos`) — mismo criterio que ya resolvía Favoritos (`Favoritos` acá,
 * `Ver favoritos` en el header): la hoja y el header se montan A LA VEZ en
 * `Layout` (la lupa y el carrito del header se ven ahora también en móvil), y
 * dos nodos con el mismo nombre rompen los `getByRole` singulares de los tests
 * de contrato.
 */

const CLASE_FILA =
  "flex min-h-12 items-center gap-3 border-b border-outline-variant py-3 font-body-lg text-body-lg text-on-surface";

export default function HojaMenu({ abierta, onCerrar }) {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const hojaRef = useDialogo({ abierto: abierta, onCerrar });
  // `activo` va acá y no alcanza con el `return null` de abajo: las reglas de
  // hooks obligan a llamar a este antes de cualquier salida temprana, así que
  // sin la bandera su efecto dispararía `GET /categorias` igual en
  // `/catalogo/admin/login` — la misma request que `Navbar` ya se ahorra.
  const { categorias } = useCategoriasNavbar({ activo: !esAdmin });
  // Mismo motivo que `useCategoriasNavbar` de arriba: las reglas de hooks no
  // dejan condicionarlo con el `return null` de abajo.
  const { cantidadTotal } = useCarrito();

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

        {/* "Buscar" y NO "Buscar productos": ese nombre ya lo lleva la lupa
            del header, visible también en móvil desde este reparto y montada
            a la vez que esta hoja. El destino es el mismo que la lupa: no hay
            un buscador propio acá, el real es el de `FiltrosCatalogo`. */}
        <Link to="/coleccion" onClick={onCerrar} className={CLASE_FILA}>
          <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
            search
          </span>
          Buscar
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

        {/* "Carrito" y NO "Ver carrito": mismo motivo que "Buscar" arriba. Es
            la fila que resuelve la regresión — el globo solo aparece con
            `cantidadTotal > 0`, misma regla que el header y la isla. */}
        <Link to="/carrito" onClick={onCerrar} className={CLASE_FILA}>
          <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
            shopping_bag
          </span>
          Carrito
          {cantidadTotal > 0 ? (
            <span className="font-label-sm text-label-sm ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-inverse-surface px-1.5 text-background">
              {cantidadTotal}
            </span>
          ) : null}
        </Link>
      </div>
    </>
  );
}
