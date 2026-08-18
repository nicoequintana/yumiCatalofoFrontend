import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import { getOrdenes } from "../../api/ordenes.js";

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "EN_PREPARACION", "ENTREGADA", "CANCELADA"];

/**
 * Estilos de badge por estado — combinaciones del paletón del proyecto,
 * cada una claramente distinguible de las demás.
 */
const ESTILOS_ESTADO = {
  PENDIENTE: "bg-surface-container-high text-on-surface-variant",
  CONFIRMADA: "bg-secondary-container text-on-secondary-container",
  EN_PREPARACION: "bg-tertiary-container text-on-tertiary-container",
  ENTREGADA: "bg-secondary text-on-primary",
  CANCELADA: "bg-error-container text-on-error-container",
};

const ETIQUETA_ESTADO = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_PREPARACION: "En preparación",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
};

function BadgeEstado({ estado }) {
  return (
    <span
      className={`font-label-sm text-label-sm inline-block rounded px-2 py-1 uppercase tracking-wide ${
        ESTILOS_ESTADO[estado] ?? "bg-surface-container-high text-on-surface-variant"
      }`}
    >
      {ETIQUETA_ESTADO[estado] ?? estado}
    </span>
  );
}

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString("es-AR");
}

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
  }, [estado, dni, page]);

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
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-16">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Órdenes</h1>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
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
            {ESTADOS.map((e) => (
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
        <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
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
          <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    Orden
                  </th>
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    Cliente
                  </th>
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    DNI
                  </th>
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    Items
                  </th>
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    Estado
                  </th>
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    Fecha
                  </th>
                  <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr key={orden.id} className="border-b border-outline-variant last:border-b-0">
                    <td className="font-body-md text-body-md px-6 py-4 text-on-surface">#{orden.id}</td>
                    <td className="font-body-md text-body-md px-6 py-4 text-on-surface">{orden.cliente?.nombre}</td>
                    <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                      {orden.cliente?.dni}
                    </td>
                    <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                      {orden._count?.items ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <BadgeEstado estado={orden.estado} />
                    </td>
                    <td className="font-body-md text-body-md whitespace-nowrap px-6 py-4 text-on-surface-variant">
                      {formatFecha(orden.createdAt)}
                    </td>
                    <td className="px-6 py-4">
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
