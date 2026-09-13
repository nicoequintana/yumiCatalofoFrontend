import CabezaSeccion, { EyebrowSeccion } from "./CabezaSeccion.jsx";
import ProductCard from "./ProductCard.jsx";

/**
 * "Nuevos ingresos" — los últimos publicados (`useNuevosIngresos`).
 *
 * PRESENTACIONAL. El badge NUEVO no se decide acá: `ProductCard` lo pinta con
 * el `esNuevo` que resuelve el backend. Sin productos no se renderiza.
 *
 * Una sola lista con dos layouts por clase (mockup `.riel.nuevos-lista`): riel
 * deslizable en mobile, grilla de 4 columnas desde `md`. La lista sangra hasta
 * el borde en mobile (`-mx-margin-mobile`) para que la tarjeta cortada al
 * borde se lea como "hay más".
 *
 * @param {Array} [productos]
 */
export default function NuevosIngresos({ productos = [] }) {
  if (productos.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12">
      <CabezaSeccion
        eyebrow={
          <EyebrowSeccion icono="new_releases" tono="tertiary">
            Recién llegados
          </EyebrowSeccion>
        }
        titulo="Nuevos ingresos"
        bajada="Lo último que sumamos a la tienda."
        enlace={{ texto: "Ver novedades", to: "/coleccion" }}
      />
      {/* `py-2`: `overflow-x-auto` recorta también en vertical, y sin aire la
          sombra de las tarjetas se corta arriba y abajo. */}
      <ul
        aria-label="Nuevos ingresos"
        className="-mx-margin-mobile flex snap-x snap-mandatory scroll-px-margin-mobile gap-3 overflow-x-auto px-margin-mobile py-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {productos.map((producto) => (
          <li key={producto.id} className="w-[172px] shrink-0 snap-start md:w-auto">
            <ProductCard producto={producto} />
          </li>
        ))}
      </ul>
    </section>
  );
}
