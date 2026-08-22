import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getAuditLogs, getErrorLogs } from "../../api/adminLogs.js";
import { formatFechaHora } from "../../utils/formato.js";
import { claseCelda, claseEncabezado } from "../../components/admin/clasesTabla.js";

const PESTANA_AUDITORIA = "auditoria";
const PESTANA_ERRORES = "errores";

const ENTIDADES = ["Producto", "Orden", "Usuario", "Categoria"];

/**
 * Etiquetas legibles para las acciones auditadas. Las que no estén acá se
 * muestran tal cual vienen del backend, así una acción nueva no queda en
 * blanco en la UI mientras no se agregue su traducción.
 */
const ETIQUETA_ACCION = {
  CREAR: "Creó",
  ACTUALIZAR: "Actualizó",
  ACTUALIZAR_ESTADO: "Cambió estado",
  ACTUALIZAR_VISIBILIDAD: "Cambió visibilidad",
  ACTUALIZAR_MERCHANDISING: "Cambió merchandising",
  ELIMINAR: "Eliminó",
  ELIMINAR_FOTO: "Eliminó foto",
};

/** Colores por tipo de acción: crear/actualizar/eliminar bien distinguibles. */
const ESTILOS_ACCION = {
  CREAR: "bg-secondary-container text-on-secondary-container",
  ELIMINAR: "bg-error-container text-on-error-container",
  ELIMINAR_FOTO: "bg-error-container text-on-error-container",
};
const ESTILO_ACCION_POR_DEFECTO = "bg-tertiary-container text-on-tertiary-container";

function BadgeAccion({ accion }) {
  return (
    <span
      className={`font-label-sm text-label-sm inline-block whitespace-nowrap rounded px-2 py-1 uppercase tracking-wide ${
        ESTILOS_ACCION[accion] ?? ESTILO_ACCION_POR_DEFECTO
      }`}
    >
      {ETIQUETA_ACCION[accion] ?? accion}
    </span>
  );
}

/**
 * Renderiza el `detalle` del AuditLog. El backend lo guarda como JSON
 * serializado (o texto plano); acá se intenta parsear para mostrarlo como
 * pares clave: valor legibles, y si no es JSON válido se muestra el texto
 * crudo en vez de romper la fila.
 */
function DetalleAuditoria({ detalle }) {
  if (!detalle) return <span className="text-on-surface-variant">—</span>;

  let parseado = null;
  try {
    parseado = JSON.parse(detalle);
  } catch {
    return <span className="text-on-surface-variant">{detalle}</span>;
  }

  if (parseado === null || typeof parseado !== "object") {
    return <span className="text-on-surface-variant">{String(parseado)}</span>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {Object.entries(parseado).map(([clave, valor]) => (
        <li key={clave} className="text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wide">{clave}:</span>{" "}
          {String(valor)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Stack trace colapsable. Arranca cerrado a propósito: un stack crudo dentro
 * de una celda de tabla rompe la lectura del listado, y en el 90% de los
 * casos alcanza con el mensaje. Se despliega solo cuando hace falta.
 */
function StackColapsable({ stack }) {
  const [abierto, setAbierto] = useState(false);

  if (!stack) return <span className="text-on-surface-variant">—</span>;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        className="font-label-md text-label-md inline-flex items-center gap-1 self-start uppercase tracking-widest text-secondary hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">
          {abierto ? "expand_less" : "expand_more"}
        </span>
        {abierto ? "Ocultar stack" : "Ver stack"}
      </button>
      {abierto ? (
        <pre className="font-body-md max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-surface-container-high p-3 text-[12px] leading-relaxed text-on-surface-variant">
          {stack}
        </pre>
      ) : null}
    </div>
  );
}

/**
 * `/catalogo/admin/logs` — módulo de logs del panel admin, con dos pestañas:
 *
 * - **Auditoría**: quién hizo qué mutación y cuándo (tabla `AuditLog`).
 * - **Errores**: el log técnico central (tabla `ErrorLog`), con stack traces
 *   colapsables.
 *
 * Las dos pestañas comparten el mismo shape paginado del backend
 * (`{ data, page, pageSize, total }`), así que reusan una sola lógica de
 * paginación. Solo se pide el feed de la pestaña activa — cambiar de pestaña
 * resetea a la página 1, porque los dos listados son independientes.
 *
 * Mismo patrón visual que `AdminOrdenes.jsx`/`AdminMetricas.jsx`: header con
 * eyebrow + título, tabla dentro de un contenedor redondeado con
 * `overflow-x-auto` (mobile-first: la tabla scrollea adentro de su caja en
 * vez de romper el layout de la página), y paginación Anterior/Siguiente.
 */
function AdminLogs() {
  const [pestana, setPestana] = useState(PESTANA_AUDITORIA);
  const [registros, setRegistros] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [entidad, setEntidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    const pedido =
      pestana === PESTANA_AUDITORIA
        ? getAuditLogs({ entidad: entidad || undefined, page })
        : getErrorLogs({ page });

    pedido
      .then((resultado) => {
        if (!activo) return;
        setRegistros(resultado.data);
        setPage(resultado.page);
        setPageSize(resultado.pageSize);
        setTotal(resultado.total);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudieron cargar los logs.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, entidad, page]);

  function handleCambiarPestana(nueva) {
    if (nueva === pestana) return;
    setPestana(nueva);
    setRegistros([]);
    setPage(1);
  }

  function handleCambiarEntidad(event) {
    setEntidad(event.target.value);
    setPage(1);
  }

  const hayAnterior = page > 1;
  const haySiguiente = page * pageSize < total;
  const esAuditoria = pestana === PESTANA_AUDITORIA;

  function claseTab(activa) {
    return `font-label-md text-label-md min-h-11 rounded-lg px-4 py-2 uppercase tracking-widest transition-colors ${
      activa
        ? "bg-primary text-on-primary"
        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
    }`;
  }

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Logs</h1>
        </div>

        {esAuditoria ? (
          <select
            value={entidad}
            onChange={handleCambiarEntidad}
            aria-label="Filtrar por entidad"
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none sm:w-auto"
          >
            <option value="">Todas las entidades</option>
            {ENTIDADES.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {/*
        Botones de alternancia, no un `tablist` de ARIA. El patrón de pestañas
        exige `role="tabpanel"`, `aria-controls` y navegación con flechas con
        `tabindex` móvil; declarar solo los roles hacía que un lector de
        pantalla anunciara "pestaña, 1 de 2" y después no encontrara ningún
        panel, y que las flechas no hicieran nada. Un grupo de toggles con
        `aria-pressed` describe exactamente lo que estos dos botones hacen.
      */}
      <div role="group" aria-label="Tipo de log" className="mb-8 flex gap-2">
        <button
          type="button"
          aria-pressed={esAuditoria}
          onClick={() => handleCambiarPestana(PESTANA_AUDITORIA)}
          className={claseTab(esAuditoria)}
        >
          Auditoría
        </button>
        <button
          type="button"
          aria-pressed={!esAuditoria}
          onClick={() => handleCambiarPestana(PESTANA_ERRORES)}
          className={claseTab(!esAuditoria)}
        >
          Errores
        </button>
      </div>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando logs…</p>
        </div>
      ) : registros.length === 0 ? (
        <EstadoVacio
          icono={esAuditoria ? "history" : "bug_report"}
          titulo={esAuditoria ? "No hay registros de auditoría" : "No hay errores registrados"}
          mensaje={
            esAuditoria
              ? "Las acciones del panel de administración van a aparecer acá a medida que se hagan."
              : "Cuando el servidor registre un error, va a aparecer acá."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
            {esAuditoria ? (
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className={claseEncabezado}>Usuario</th>
                    <th className={claseEncabezado}>Acción</th>
                    <th className={claseEncabezado}>Entidad</th>
                    <th className={claseEncabezado}>ID</th>
                    <th className={claseEncabezado}>Detalle</th>
                    <th className={claseEncabezado}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro) => (
                    <tr key={registro.id} className="border-b border-outline-variant last:border-b-0">
                      <td className={`${claseCelda} text-on-surface`}>{registro.usuarioEmail}</td>
                      <td className="px-4 py-3 align-top">
                        <BadgeAccion accion={registro.accion} />
                      </td>
                      <td className={`${claseCelda} text-on-surface`}>{registro.entidad}</td>
                      <td className={`${claseCelda} text-on-surface-variant`}>
                        {registro.entidadId === null || registro.entidadId === undefined
                          ? "—"
                          : `#${registro.entidadId}`}
                      </td>
                      <td className={claseCelda}>
                        <DetalleAuditoria detalle={registro.detalle} />
                      </td>
                      <td className={`${claseCelda} whitespace-nowrap text-on-surface-variant`}>
                        {formatFechaHora(registro.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className={claseEncabezado}>Mensaje</th>
                    <th className={claseEncabezado}>Ruta</th>
                    <th className={claseEncabezado}>Método</th>
                    <th className={claseEncabezado}>Status</th>
                    <th className={claseEncabezado}>Stack</th>
                    <th className={claseEncabezado}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro) => (
                    <tr key={registro.id} className="border-b border-outline-variant last:border-b-0">
                      <td className={`${claseCelda} max-w-sm text-on-surface`}>{registro.mensaje}</td>
                      <td className={`${claseCelda} text-on-surface-variant`}>{registro.ruta ?? "—"}</td>
                      <td className={`${claseCelda} text-on-surface-variant`}>{registro.metodo ?? "—"}</td>
                      <td className={`${claseCelda} text-on-surface-variant`}>{registro.status ?? "—"}</td>
                      <td className={claseCelda}>
                        <StackColapsable stack={registro.stack} />
                      </td>
                      <td className={`${claseCelda} whitespace-nowrap text-on-surface-variant`}>
                        {formatFechaHora(registro.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

export default AdminLogs;
