import CabezaSeccion, { EyebrowSeccion } from "./CabezaSeccion.jsx";
import EstadoVacio from "./EstadoVacio.jsx";
import ProductCard from "./ProductCard.jsx";
import { MAS_VENDIDOS_POR_SECCION, MIN_MAS_VENDIDOS } from "../hooks/useMasVendidos.js";

/** Columnas de la grilla de escritorio (`md:grid-cols-4`). */
const COLUMNAS_ESCRITORIO = 4;

/**
 * "Más vendidos" — el ranking lo arma el backend (unidades en 90 días, T3).
 *
 * PRESENTACIONAL: `Catalogo.jsx` llama a `useMasVendidos` y pasa el resultado.
 *
 * - Con `error` muestra `EstadoVacio` `cloud_off`: "falló la carga" no es
 *   "no hay más vendidos".
 * - Sin error y con menos de `MIN_MAS_VENDIDOS`, no se renderiza: la grilla de
 *   4 columnas no llenaría una fila.
 * - Dibuja SOLO filas completas de la grilla de escritorio (4 columnas):
 *   `floor(n / 4) * 4`, con tope de 8. Como el resultado es múltiplo de 4,
 *   la grilla de 2 columnas de mobile también queda completa.
 *
 * @param {Array} [productos]
 * @param {string|null} [error]
 */
export default function MasVendidos({ productos = [], error = null }) {
  if (error) {
    return (
      <section className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
        <EstadoVacio icono="cloud_off" titulo="No se pudieron cargar los más vendidos" mensaje={error} />
      </section>
    );
  }

  if (productos.length < MIN_MAS_VENDIDOS) return null;

  const filasCompletas = Math.floor(productos.length / COLUMNAS_ESCRITORIO) * COLUMNAS_ESCRITORIO;
  const visibles = productos.slice(0, Math.min(MAS_VENDIDOS_POR_SECCION, filasCompletas));

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12">
      <CabezaSeccion
        eyebrow={<EyebrowSeccion icono="trending_up">Lo que más se lleva</EyebrowSeccion>}
        titulo="Más vendidos"
        bajada="Los productos que más eligió la comunidad en los últimos meses."
        enlace={{ texto: "Ver catálogo", to: "/coleccion" }}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {visibles.map((producto) => (
          <ProductCard key={producto.id} producto={producto} />
        ))}
      </div>
    </section>
  );
}
