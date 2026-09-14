import CabezaSeccion, { EyebrowSeccion } from "./CabezaSeccion.jsx";
import EstadoVacio from "./EstadoVacio.jsx";
import ProductCard from "./ProductCard.jsx";

/** Columnas de la grilla de escritorio (`md:grid-cols-4`), mismo criterio que `MasVendidos`. */
const COLUMNAS_ESCRITORIO = 4;

/**
 * Tope de tarjetas por vidriera. Espeja `MAX_PRODUCTOS_VITRINA_HOME` del
 * backend (`campanias.controller.js`) — ver `.claude/rules/sincronizaciones.md`.
 */
const MAX_PRODUCTOS_POR_VITRINA = 8;

/**
 * Filas completas de la grilla de escritorio, con tope: `floor(n / 4) * 4`,
 * máximo 8. Mismo cálculo que `MasVendidos` — el backend ya topea en 8, pero
 * no garantiza un múltiplo de 4 (nada en el contrato lo exige), así que el
 * recorte sigue haciendo falta acá para no dejar una fila a medias en la
 * grilla `md:grid-cols-4`.
 */
function filasCompletas(productos) {
  const completas = Math.floor(productos.length / COLUMNAS_ESCRITORIO) * COLUMNAS_ESCRITORIO;
  return productos.slice(0, Math.min(MAX_PRODUCTOS_POR_VITRINA, completas));
}

/**
 * "Vitrinas de campaña" — una sección de productos por campaña ACTIVA
 * (`GET /campanias/vitrinas`), una `<section>` por campaña, con la MISMA
 * estructura visual que `MasVendidos`: mismo `CabezaSeccion` + `EyebrowSeccion`,
 * misma grilla `grid-cols-2 md:grid-cols-4`.
 *
 * PRESENTACIONAL: `Catalogo.jsx` llama a `useVitrinasCampania` y pasa el
 * resultado. El backend ya decidió QUÉ campañas entran (`MIN_PRODUCTOS_VITRINA_HOME`)
 * y en qué orden (prioridad descendente) — acá no se vuelve a filtrar por
 * cantidad, solo se recortan filas completas por vidriera.
 *
 * - Con `error` muestra UN solo `EstadoVacio` `cloud_off` para toda la
 *   sección: no hay una vidriera individual a la que atribuirle la falla.
 * - Sin error, una `<section>` por campaña, en el orden que manda el backend.
 *
 * @param {Array<{campaniaId: number, nombre: string, productos: Array}>} [vitrinas]
 * @param {string|null} [error]
 */
export default function VitrinasCampania({ vitrinas = [], error = null }) {
  if (error) {
    return (
      <section className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
        <EstadoVacio icono="cloud_off" titulo="No se pudieron cargar las campañas" mensaje={error} />
      </section>
    );
  }

  return (
    <>
      {vitrinas.map(({ campaniaId, nombre, productos }) => {
        const visibles = filasCompletas(productos);
        if (visibles.length === 0) return null;

        return (
          <section
            key={campaniaId}
            className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12"
          >
            <CabezaSeccion
              eyebrow={<EyebrowSeccion icono="local_offer">Campaña vigente</EyebrowSeccion>}
              titulo={nombre}
              enlace={{ texto: "Ver todo", to: `/coleccion?campania=${campaniaId}` }}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {visibles.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
