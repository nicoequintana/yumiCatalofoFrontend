import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Paginador from "../../components/Paginador.jsx";
import { getProducts } from "../../api/products.js";
import { claseTablaApilada } from "../../components/admin/clasesTabla.js";

/**
 * `/catalogo/admin/metricas` — read-only table of view/share counts per
 * product (design item: Feature 3 of the 6-feature batch). Built as a flat
 * table specifically so more metrics can be added later as columns, without
 * restructuring this screen.
 */
function AdminMetricas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paginaUrl = Number(searchParams.get("page"));
  const pagina = Number.isInteger(paginaUrl) && paginaUrl > 0 ? paginaUrl : 1;

  const [productos, setProductos] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Contador de reintentos: el botón "Reintentar" lo incrementa y eso
  // re-dispara el efecto de fetch sin tocar la página. Sin él, tras un fallo
  // la única salida era recargar la pantalla entera.
  const [reintento, setReintento] = useState(0);

  function irAPagina(numero, { reemplazar = false } = {}) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (numero <= 1) {
          next.delete("page");
        } else {
          next.set("page", String(numero));
        }
        return next;
      },
      { replace: reemplazar },
    );
  }

  useEffect(() => {
    let activo = true;

    setCargando(true);

    // El "más visto primero" lo resuelve el backend (`orden=vistas`), no un
    // sort local: con el listado paginado, ordenar del lado del cliente solo
    // reordenaría la página que tocó y el ranking sería directamente falso.
    getProducts({ admin: true, orden: "vistas", page: pagina })
      .then(({ data, total, pageSize }) => {
        if (!activo) return;
        setProductos(data);
        setTotalPaginas(Math.max(1, Math.ceil(total / pageSize)));
        // Un fetch exitoso limpia cualquier error anterior: sin esto la
        // pantalla quedaba clavada en el error aunque el backend ya volvió.
        setError(null);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre, sin decir qué pasó.
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar las métricas. Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [pagina, reintento]);

  // Un link viejo o un catálogo que se achicó pueden dejar la URL apuntando a
  // una página que ya no existe. Mismo patrón que AdminProductos: se corrige
  // a la última página real en vez de mostrar una tabla vacía que mentiría.
  useEffect(() => {
    if (cargando) return;
    // `reemplazar`: la página inválida no debe quedar en el historial, o
    // "atrás" volvería a ella y la corrección se repetiría para siempre.
    if (pagina > totalPaginas) irAPagina(totalPaginas, { reemplazar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, pagina, totalPaginas]);

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Métricas</h1>
        </div>

        {/* Vistas y compartidos se mueven solos mientras se mira la pantalla:
            los incrementa cada visitante del catálogo público. Reutiliza el
            contador `reintento` que ya dispara el refetch — un segundo
            contador para lo mismo serían dos formas de recargar la misma
            tabla. */}
        <BotonActualizar
          onActualizar={() => setReintento((actual) => actual + 1)}
          actualizando={cargando}
        />
      </div>

      {error ? (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg bg-error-container px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body-md text-body-md text-on-error-container">{error}</p>
          <button
            type="button"
            onClick={() => setReintento((actual) => actual + 1)}
            className="font-label-md text-label-md shrink-0 rounded-lg border border-on-error-container px-4 py-2 uppercase tracking-widest text-on-error-container hover:bg-error-container"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando métricas…</p>
        </div>
      ) : error ? null : productos.length === 0 ? (
        <EstadoVacio
          icono="query_stats"
          titulo="Todavía no hay productos"
          mensaje="Las métricas van a aparecer acá una vez que tengas productos publicados."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
          <table role="table" className={`${claseTablaApilada} w-full min-w-[600px] text-left`}>
            <thead role="rowgroup">
              <tr role="row" className="border-b border-outline-variant">
                <th role="columnheader" className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  SKU
                </th>
                <th role="columnheader" className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th role="columnheader" className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Vistas
                </th>
                <th role="columnheader" className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Compartidos
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {productos.map((producto) => (
                <tr key={producto.id} role="row" className="border-b border-outline-variant last:border-b-0">
                  <td role="cell" data-label="SKU" className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{producto.sku}</td>
                  <td role="cell" data-celda="identidad" className="font-body-md text-body-md px-4 py-3 text-on-surface">{producto.nombre}</td>
                  <td role="cell" data-label="Vistas" className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{producto.vistas}</td>
                  <td role="cell" data-label="Compartidos" className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                    {producto.compartidos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && !error && productos.length > 0 ? (
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={irAPagina}
          etiqueta="Paginación de métricas"
        />
      ) : null}
    </main>
  );
}

export default AdminMetricas;
