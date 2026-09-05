import { Link } from "react-router-dom";
import { rutaCategoria } from "../utils/slug.js";

/**
 * El mapa del catálogo: "Todos" más las categorías que tienen algo publicado.
 *
 * Es una LISTA PELADA, sin caja ni posicionamiento: la envuelven el dropdown de
 * escritorio y la hoja del menú móvil, que son dos superficies con formas
 * distintas. Poner la caja acá obligaría a una prop de variante.
 *
 * Cada categoría linkea a `/coleccion/categoria/:slug` y NUNCA a
 * `/coleccion?categoria=`: `Coleccion.jsx` blanquea los filtros heredados al
 * MONTAR, así que un link con querystring perdería el filtro viniendo de la home
 * y lo aplicaría estando ya en `/coleccion` — el mismo control haciendo dos
 * cosas según de dónde venís. La ruta propia es la identidad de la página y no
 * se blanquea.
 */
export default function PanelCategorias({ categorias, onNavegar }) {
  return (
    <ul className="flex flex-col">
      <li>
        <Link
          to="/coleccion"
          onClick={onNavegar}
          className="flex min-h-11 items-center border-b border-outline-variant px-3 py-2 font-body-md text-body-md font-semibold text-on-surface transition-colors hover:bg-surface-container"
        >
          Todos los productos
        </Link>
      </li>

      {/* `rutaCategoria` devuelve `null` cuando el nombre no produce slug (queda
          vacío al sacarle acentos y símbolos). Un `<Link to={null}>` renderiza
          un ancla sin destino: se ve clickeable y no lleva a ningún lado. */}
      {categorias.map((categoria) => {
        const ruta = rutaCategoria(categoria);
        if (!ruta) return null;

        return (
          <li key={categoria.id}>
            {/* Solo el nombre. El conteo se mostró hasta el 05/09/2026 y se
                quitó por pedido: al visitante no le dice nada útil —no elige
                una categoría por tener 27 productos en vez de 9— y convertía
                una lista de destinos en una tabla de números.

                ⚠️ `cantidadPublicados` SIGUE siendo indispensable, solo que
                para FILTRAR: `useCategoriasNavbar` descarta las categorías sin
                nada publicado, porque su link caería en una grilla vacía. Que
                el número ya no se vea no significa que se pueda dejar de
                pedir. */}
            <Link
              to={ruta}
              onClick={onNavegar}
              className="flex min-h-11 items-center px-3 py-2 font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container"
            >
              {categoria.nombre}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
