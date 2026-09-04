import { Link, useLocation } from "react-router-dom";
import useCarrito from "../hooks/useCarrito.js";

/**
 * La navegación del catálogo en celular: una isla flotante al alcance del
 * pulgar.
 *
 * POR QUÉ ABAJO. El header es sticky y alcanzarlo pide estirar el pulgar hasta
 * el borde superior en cada movimiento. La isla vive donde la mano ya está.
 *
 * SOLO POR DEBAJO DE `md`. En escritorio la navegación está en el `Navbar`, que
 * ahí tiene el ancho para mostrarla entera.
 *
 * **El guard `esAdmin` no es cosmético**: `/catalogo/admin/login` se renderiza
 * dentro del mismo `Layout` público, y la lupa de acá lleva el `aria-label`
 * "Buscar productos" — el mismo que un campo del editor de campañas. Montarla en
 * una vista de admin volvería ambiguo ese selector y rompería un E2E por una
 * razón que no tiene nada que ver con lo que prueba.
 *
 * El activo se marca con FORMA (una cápsula detrás del ícono) y no con color: la
 * isla es monocroma y el único color que lleva es el globo del carrito. Sobre un
 * fondo oscuro, el color como única señal es lo primero que se pierde.
 */

/** El fondo de la ranura activa. Cápsula, no color. */
const CLASE_RANURA =
  "relative inline-flex h-12 w-[62px] items-center justify-center rounded-full text-background transition-colors";
const CLASE_ACTIVA = "bg-background/20";

export default function NavFlotante({ menuAbierto, onAlternarMenu }) {
  const { pathname } = useLocation();
  const { cantidadTotal } = useCarrito();

  if (pathname.startsWith("/catalogo/admin")) return null;

  const enInicio = pathname === "/";
  const enColeccion = pathname.startsWith("/coleccion");

  return (
    <nav
      aria-label="Navegación rápida"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-margin-mobile pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
    >
      {/* `bg-inverse-surface/90`: el token vive en CANALES, así que Tailwind
          puede componerle alfa. Con un hex adentro de la variable esta clase no
          emitiría NINGUNA regla y la isla quedaría transparente — sin error,
          sin warning y sin test rojo.

          `z-40` y no `z-50`: el cartel de campaña es `fixed inset-0` con
          `z-[60]`, y la isla tiene que quedar por debajo. Si no, su botón de
          cerrar compite con la hamburguesa. */}
      <div className="flex items-center gap-1 rounded-full bg-inverse-surface/90 p-2 shadow-ambient backdrop-blur-[10px]">
        <Link
          to="/"
          aria-label="Inicio"
          aria-current={enInicio ? "page" : undefined}
          className={`${CLASE_RANURA} ${enInicio ? CLASE_ACTIVA : ""}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[25px]">
            home
          </span>
        </Link>

        <Link
          to="/coleccion"
          aria-label="Buscar productos"
          aria-current={enColeccion ? "page" : undefined}
          className={`${CLASE_RANURA} ${enColeccion ? CLASE_ACTIVA : ""}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[25px]">
            search
          </span>
        </Link>

        <Link to="/carrito" aria-label="Ver carrito" className={CLASE_RANURA}>
          <span aria-hidden="true" className="material-symbols-outlined text-[25px]">
            shopping_bag
          </span>
          {/* Solo con algo adentro: un "0" permanente es ruido. Misma regla que
              ya tenía el carrito del header. */}
          {cantidadTotal > 0 ? (
            <span className="font-label-sm text-label-sm absolute right-2 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-on-primary">
              {cantidadTotal}
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="hoja-menu"
          onClick={onAlternarMenu}
          className={`${CLASE_RANURA} ${menuAbierto ? CLASE_ACTIVA : ""}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[25px]">
            {menuAbierto ? "close" : "menu"}
          </span>
        </button>
      </div>
    </nav>
  );
}
