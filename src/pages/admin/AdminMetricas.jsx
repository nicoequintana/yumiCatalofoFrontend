import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Paginador from "../../components/Paginador.jsx";
import { getProducts } from "../../api/products.js";

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

  function irAPagina(numero) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (numero <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(numero));
      }
      return next;
    });
  }

  useEffect(() => {
    let activo = true;

    // El "más visto primero" lo resuelve el backend (`orden=vistas`), no un
    // sort local: con el listado paginado, ordenar del lado del cliente solo
    // reordenaría la página que tocó y el ranking sería directamente falso.
    getProducts({ admin: true, orden: "vistas", page: pagina })
      .then(({ data, total, pageSize }) => {
        if (!activo) return;
        setProductos(data);
        setTotalPaginas(Math.max(1, Math.ceil(total / pageSize)));
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
  }, [pagina]);

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Panel de administración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Métricas</h1>
      </div>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
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
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  SKU
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Vistas
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Compartidos
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{producto.sku}</td>
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface">{producto.nombre}</td>
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{producto.vistas}</td>
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
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
