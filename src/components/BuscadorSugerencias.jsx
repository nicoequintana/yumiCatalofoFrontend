import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts } from "../api/products.js";
import { formatPrecio } from "../utils/formato.js";
import { precioAPagar } from "../utils/precioEfectivo.js";
import { rutaProducto } from "../utils/slug.js";

const DEBOUNCE_MS = 250;
const MAX_SUGERENCIAS = 5;

// Mismo mensaje que el resto del catálogo público usa para "falló la carga"
// (ver "Invariante: pantallas que responden ¿hay productos?" en
// docs/reglas/catalogo-publico.md). No se reusa `EstadoVacio` entero: ese
// diseño es de página completa, no de un dropdown angosto colgado del input.
const MENSAJE_ERROR_CARGA = "Revisá tu conexión e intentá de nuevo.";

/**
 * Buscador con sugerencias en vivo, montado en dos lugares con distinto ancho
 * (T12: Navbar de escritorio; T15: arriba de la home en mobile) — por eso
 * `className` es la única prop y el componente no asume ningún ancho propio.
 *
 * **Reusa el ÚNICO contrato de búsqueda que existe**: `getProducts({ search,
 * pageSize })`, el mismo `GET /products?search=&pageSize=` que ya consume
 * `FiltrosCatalogo`. No hay un segundo endpoint de búsqueda ni un segundo
 * criterio de "qué es un resultado".
 *
 * **No calcula ningún precio.** El precio de cada sugerencia sale de
 * `precioAPagar` + `formatPrecio` — las mismas dos funciones que usa
 * `PrecioProducto` para "cuánto sale esto" — así que una promoción vigente
 * se refleja acá sin que este componente sepa nada de cómo se resuelve un
 * descuento.
 *
 * **Nombre accesible propio**: "Buscar en el catálogo", distinto de "Buscar
 * productos" (la lupa de `Navbar.jsx`) y de "Buscar" (el input real de
 * `FiltrosCatalogo`) — los tres tienen que poder convivir sin volver
 * ambiguo ningún `getByRole` de los tests de contrato ya existentes.
 *
 * Dos guardas que no se ven a simple vista:
 * - **Respuestas fuera de orden se descartan.** Un pedido lento por un
 *   término viejo puede resolver DESPUÉS que uno más nuevo; sin un id de
 *   pedido comparado al llegar la respuesta, el resultado viejo pisaría el
 *   que ya está en pantalla.
 * - **"No hay resultados" y "falló la carga" son dos estados distintos**,
 *   mismo criterio que el resto del catálogo público: un catch que solo
 *   vaciara la lista haría que un backend caído se leyera como "no hay
 *   productos", que es mentira.
 */
function BuscadorSugerencias({ className = "" }) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const pedidoIdRef = useRef(0);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const limpio = termino.trim();

    if (limpio.length < 2) {
      setResultados([]);
      setError(false);
      setAbierto(false);
      return undefined;
    }

    debounceRef.current = setTimeout(async () => {
      const idDeEstePedido = ++pedidoIdRef.current;
      try {
        const res = await getProducts({ search: limpio, pageSize: MAX_SUGERENCIAS });
        if (idDeEstePedido !== pedidoIdRef.current) return; // respuesta vieja: se descarta
        setResultados(res.data.slice(0, MAX_SUGERENCIAS));
        setTotal(res.total);
        setError(false);
        setAbierto(true);
      } catch {
        if (idDeEstePedido !== pedidoIdRef.current) return;
        setResultados([]);
        setError(true);
        setAbierto(true);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [termino]);

  const limpio = termino.trim();
  const hrefTodos = `/coleccion?search=${encodeURIComponent(limpio)}`;

  function irATodos() {
    if (!limpio) return;
    navigate(hrefTodos);
    setAbierto(false);
  }

  return (
    <div className={`relative ${className}`}>
      <label className="flex h-11 items-center gap-2 rounded-full bg-surface-container-low px-4 focus-within:bg-surface-container-lowest focus-within:shadow-ambient">
        <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-on-surface-variant">
          search
        </span>
        <input
          type="search"
          role="searchbox"
          aria-label="Buscar en el catálogo"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") irATodos();
            if (e.key === "Escape") setAbierto(false);
          }}
          placeholder="Buscar productos, categorías…"
          autoComplete="off"
          // 16px, nunca menos: por debajo de eso Safari en iOS hace zoom
          // automático al enfocar el campo.
          className="font-body-md w-full min-w-0 border-0 bg-transparent text-[16px] text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </label>

      {abierto ? (
        <div
          role="listbox"
          aria-label="Sugerencias de búsqueda"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl bg-surface-container-lowest p-1.5 shadow-ambient"
        >
          {error ? (
            <p className="font-body-md text-body-md p-3 text-on-surface-variant">{MENSAJE_ERROR_CARGA}</p>
          ) : resultados.length === 0 ? (
            <p className="font-body-md text-body-md p-3 text-on-surface-variant">
              No encontramos productos para "{limpio}". Probá con otra palabra.
            </p>
          ) : (
            <>
              {resultados.map((producto) => (
                <Link
                  key={producto.id}
                  to={rutaProducto(producto)}
                  role="option"
                  onClick={() => setAbierto(false)}
                  className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl p-1.5 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    {producto.fotos?.[0] ? (
                      <img
                        src={producto.fotos[0].url}
                        alt={producto.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <b className="font-label-md text-label-md block truncate text-primary">{producto.nombre}</b>
                    {producto.categoria?.nombre ? (
                      <small className="font-body-sm text-body-sm block truncate text-outline">
                        {producto.categoria.nombre}
                      </small>
                    ) : null}
                  </span>
                  <span className="font-label-md text-label-md text-secondary">
                    {formatPrecio(precioAPagar(producto))}
                  </span>
                </Link>
              ))}

              <Link
                to={hrefTodos}
                onClick={() => setAbierto(false)}
                className="font-label-md text-label-md flex w-full items-center justify-between rounded-xl p-3 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Ver todos los resultados para "{limpio}" ({total})
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default BuscadorSugerencias;
