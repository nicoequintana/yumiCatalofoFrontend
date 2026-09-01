import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import { getOrdenes } from "../../api/ordenes.js";
import { formatFecha } from "../../utils/formato.js";
import BadgeEstado from "../../components/admin/BadgeEstado.jsx";
import { claseEncabezado } from "../../components/admin/clasesTabla.js";
import { ESTADOS_ORDEN, ETIQUETA_ESTADO } from "../../constants/ordenes.js";

/**
 * `/catalogo/admin/ordenes` — listado paginado de órdenes (Sprint 6, Task 2).
 * Soporta filtro por estado y por `?dni=` en la URL (destino del link "ver
 * historial" desde `AdminOrdenDetalle.jsx`), mismo patrón visual que
 * AdminCategorias/AdminProductos.
 */
function AdminOrdenes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dniInicial = searchParams.get("dni") ?? "";

  const [ordenes, setOrdenes] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState("");
  const [dni, setDni] = useState(dniInicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  /**
   * Contador que dispara un refetch al incrementarse — mismo patrón que
   * `AdminMetricas` y `AdminPrecios`. Lo usa el botón Actualizar: es la pantalla
   * donde más rinde, porque las órdenes entran solas mientras se la mira.
   */
  const [refresco, setRefresco] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getOrdenes({ estado: estado || undefined, dni: dni || undefined, page })
      .then((resultado) => {
        if (!activo) return;
        setOrdenes(resultado.data);
        setPage(resultado.page);
        setPageSize(resultado.pageSize);
        setTotal(resultado.total);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudo cargar el listado de órdenes.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, dni, page, refresco]);

  function handleCambiarEstado(event) {
    setEstado(event.target.value);
    setPage(1);
  }

  function limpiarFiltroDni() {
    setDni("");
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("dni");
      return next;
    });
  }

  const hayAnterior = page > 1;
  const haySiguiente = page * pageSize < total;

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Órdenes</h1>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {/* La pantalla donde más rinde: los pedidos entran mientras se la
              mira. Conserva el filtro de estado, el DNI y la página — que es lo
              único que este botón agrega sobre recargar con F5. */}
          <BotonActualizar
            onActualizar={() => setRefresco((n) => n + 1)}
            actualizando={cargando}
          />
          <Link
            to="/catalogo/admin/ordenes/productos-solicitados"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            Productos solicitados
          </Link>

          {dni ? (
            <span className="font-body-md text-body-md flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2 text-on-surface-variant">
              DNI: {dni}
              <button
                type="button"
                onClick={limpiarFiltroDni}
                aria-label="Quitar filtro por DNI"
                className="material-symbols-outlined text-[16px] hover:text-on-surface"
              >
                close
              </button>
            </span>
          ) : null}

          <select
            value={estado}
            onChange={handleCambiarEstado}
            aria-label="Filtrar por estado"
            className="font-body-md text-body-md rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">Todos</option>
            {ESTADOS_ORDEN.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando órdenes…</p>
        </div>
      ) : ordenes.length === 0 ? (
        <EstadoVacio
          icono="receipt_long"
          titulo="No hay órdenes"
          mensaje="Todavía no hay órdenes que coincidan con el filtro seleccionado."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className={claseEncabezado}>
                    Orden
                  </th>
                  <th className={claseEncabezado}>
                    Cliente
                  </th>
                  <th className={claseEncabezado}>
                    DNI
                  </th>
                  <th className={claseEncabezado}>
                    Items
                  </th>
                  <th className={claseEncabezado}>
                    Estado
                  </th>
                  <th className={claseEncabezado}>
                    Fecha
                  </th>
                  <th className={claseEncabezado}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr key={orden.id} className="border-b border-outline-variant last:border-b-0">
                    <td className="font-body-md text-body-md px-4 py-3 text-on-surface">#{orden.id}</td>
                    <td className="font-body-md text-body-md px-4 py-3 text-on-surface">{orden.cliente?.nombre}</td>
                    <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                      {orden.cliente?.dni}
                    </td>
                    <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                      {orden._count?.items ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeEstado estado={orden.estado} />
                    </td>
                    <td className="font-body-md text-body-md whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {formatFecha(orden.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/catalogo/admin/ordenes/${orden.id}`}
                        className="font-label-md text-label-md uppercase tracking-widest text-secondary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!hayAnterior}
              className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-body-md text-body-md text-on-surface-variant">Página {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!haySiguiente}
              className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default AdminOrdenes;
