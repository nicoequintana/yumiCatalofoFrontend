import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useCarrito from "../hooks/useCarrito.js";
import useDialogo from "../hooks/useDialogo.js";

/**
 * Navegación principal del catálogo público. Es la única lista de destinos del
 * header: la usan tanto la barra de escritorio como el panel móvil, así que un
 * destino nuevo se agrega en un solo lugar.
 *
 * Deliberadamente NO hay un item "Categorías": llevaría a
 * `/coleccion?categoria=…`, y `Coleccion.jsx` blanquea los filtros heredados al
 * MONTAR. Un link así perdería el filtro viniendo de la home pero lo aplicaría
 * si ya estabas en `/coleccion` (el componente no remonta) — el mismo control
 * haciendo dos cosas distintas según de dónde venís.
 */
const DESTINOS = [
  { to: "/", texto: "Inicio", esActivo: (pathname) => pathname === "/" },
  {
    to: "/coleccion",
    texto: "Productos",
    esActivo: (pathname) => pathname.startsWith("/coleccion"),
  },
];

/**
 * Header público: wordmark a la izquierda, navegación al centro y acciones a la
 * derecha, con panel desplegable en móvil.
 *
 * **No hay ícono de cuenta**, aunque el mockup lo mostraba: este proyecto no
 * tiene login público — el checkout es de invitado por DNI. Un ícono de persona
 * sería un control que no lleva a ninguna parte.
 *
 * **La lupa navega a `/coleccion`, no abre un input acá.** El buscador real es
 * el de `FiltrosCatalogo`, que además escribe el término en la URL; un segundo
 * campo en el header serían dos buscadores compitiendo por el mismo estado. Su
 * `aria-label` es "Buscar productos" y no "Buscar" justamente para no colisionar
 * con el nombre accesible de ese input.
 *
 * **Todo lo público cae bajo el mismo guard `esAdmin`** — navegación, acciones y
 * botón de menú — porque `/catalogo/admin/login` se renderiza dentro de este
 * mismo `Layout`. Lo único que sobrevive ahí es el wordmark, que sigue siendo un
 * link a la home.
 *
 * El badge del carrito solo aparece con `cantidadTotal > 0` (nada de un "0"
 * permanente) y favoritos sigue sin contador: es una asimetría confirmada entre
 * las dos features, no una inconsistencia a emparejar.
 */
function Navbar() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const { cantidadTotal } = useCarrito();

  const [menuAbierto, setMenuAbierto] = useState(false);

  // Navegar cierra el panel. Sin esto, tocar un destino cambia la página por
  // detrás de un menú que sigue tapándola.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  // El panel es una superficie modal de verdad (cubre la página con un velo),
  // así que le corresponde la semántica completa de diálogo: foco inicial
  // adentro, trampa de foco, Escape y devolución del foco al botón que lo abrió.
  // `useDialogo` es el módulo compartido que ya resuelve las cuatro.
  const panelRef = useDialogo({
    abierto: menuAbierto,
    onCerrar: () => setMenuAbierto(false),
  });

  // Con el panel abierto la página de atrás no debe scrollear: está tapada, y
  // el gesto de scroll ahí mueve contenido que no se ve.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [menuAbierto]);

  const claseAccion =
    "relative inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high";

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow">
      {/* `relative z-50` no es decorativo: el velo del panel móvil es `fixed`
          con z-index, y dentro del contexto de apilado que crea el header
          sticky un elemento posicionado se pinta por encima de uno estático.
          Sin esto, el velo taparía la propia barra y el botón "Cerrar menú"
          dejaría de ser clickeable. */}
      <div className="relative z-50 mx-auto flex w-full max-w-container-max items-center justify-between gap-4 bg-background px-margin-mobile py-4 md:grid md:grid-cols-[1fr_auto_1fr] md:px-margin-desktop md:py-5">
        <Link
          to="/"
          className="font-headline-md text-headline-md tracking-[0.28em] text-on-surface transition-colors hover:text-primary"
        >
          YIMA
        </Link>

        {esAdmin ? null : (
          <>
            <nav aria-label="Navegación principal" className="hidden md:flex md:justify-center">
              <ul className="flex items-center gap-10">
                {DESTINOS.map((destino) => {
                  const activo = destino.esActivo(pathname);
                  return (
                    <li key={destino.to}>
                      <Link
                        to={destino.to}
                        aria-current={activo ? "page" : undefined}
                        className={`inline-block border-b-2 pb-1 font-body-md text-body-md font-medium transition-colors ${
                          activo
                            ? "border-on-surface text-on-surface"
                            : "border-transparent text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {destino.texto}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-1 md:justify-end md:gap-2">
              <Link to="/coleccion" aria-label="Buscar productos" className={claseAccion}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  search
                </span>
              </Link>

              {/* Favoritos queda fuera de la fila en móvil (vive en el panel,
                  como en el mockup). El link del panel se rotula "Favoritos" a
                  secas, así que aunque los dos estuvieran montados a la vez
                  nunca comparten nombre accesible con este. */}
              <Link
                to="/favoritos"
                aria-label="Ver favoritos"
                className={`${claseAccion} hidden md:inline-flex`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  favorite
                </span>
              </Link>

              <Link to="/carrito" aria-label="Ver carrito" className={claseAccion}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  shopping_bag
                </span>
                {cantidadTotal > 0 ? (
                  <span className="font-label-sm text-label-sm absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-inverse-surface px-1 text-background">
                    {cantidadTotal}
                  </span>
                ) : null}
              </Link>

              <button
                type="button"
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
                onClick={() => setMenuAbierto((abierto) => !abierto)}
                className={`${claseAccion} md:hidden`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
                  {menuAbierto ? "close" : "menu"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* El panel se MONTA solo mientras está abierto, en vez de quedar oculto
          con `hidden`. Además de ser lo correcto para el foco, evita duplicar
          destinos en el DOM: con las dos copias montadas, cualquier consulta
          por rol o texto encontraría dos nodos para el mismo link. */}
      {menuAbierto && !esAdmin ? (
        <>
          <div
            // `bg-inverse-surface opacity-20` y NO `bg-inverse-surface/20`: los
            // colores del proyecto son `var(--color-x)` con un hex adentro, y
            // Tailwind 3 no puede componerles alfa — descarta la utilidad y no
            // emite ninguna regla, así que el velo quedaría invisible. Bajar la
            // opacidad del elemento entero es seguro justamente acá porque el
            // velo no tiene contenido; en la tarjeta del hero, que sí lo tiene,
            // la salida es un fondo sólido.
            className="fixed inset-0 z-40 bg-inverse-surface opacity-20 md:hidden"
            onClick={() => setMenuAbierto(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            tabIndex={-1}
            className="relative z-50 border-t border-outline-variant bg-background px-margin-mobile pb-6 pt-2 md:hidden"
          >
            <ul className="flex flex-col">
              {[...DESTINOS, { to: "/favoritos", texto: "Favoritos" }].map((destino) => (
                <li key={destino.to}>
                  <Link
                    to={destino.to}
                    aria-current={destino.esActivo?.(pathname) ? "page" : undefined}
                    className="flex min-h-11 items-center border-b border-outline-variant py-3 font-body-lg text-body-lg text-on-surface"
                  >
                    {destino.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </header>
  );
}

export default Navbar;
