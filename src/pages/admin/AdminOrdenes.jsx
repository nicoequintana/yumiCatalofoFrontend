import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import DialogoNotificarEstado from "../../components/admin/DialogoNotificarEstado.jsx";
import TableroOrdenes from "../../components/admin/ordenes/TableroOrdenes.jsx";
import useColumnasOrdenes from "../../hooks/useColumnasOrdenes.js";
import { actualizarEstadoOrden, getEstadosOrden } from "../../api/ordenes.js";

/**
 * `/catalogo/admin/ordenes` — el tablero de órdenes.
 *
 * Reemplazó a la tabla paginada: una columna por estado, con la orden viviendo
 * en la columna que le corresponde y el cambio de estado hecho arrastrando la
 * tarjeta. Abajo de `lg` se ve una columna por vez, elegida con los tabs — y
 * ahí los tabs son ADEMÁS la zona donde se suelta la tarjeta para moverla, así
 * que el gesto es el mismo en las dos anchuras.
 *
 * **Todo movimiento entra por `abrirMovimiento`**, venga de donde venga: una
 * sola ruta de escritura, y el diálogo de notificación es el mismo de siempre.
 *
 * ⚠️ **Un fallo de `getEstadosOrden` ya no se puede tragar en silencio.** En la
 * tabla vieja el `.catch(() => {})` era correcto: el filtro por estado era un
 * extra y la tabla seguía andando sin él. Acá los estados SON las columnas: sin
 * ellos no hay pantalla, así que el error se muestra.
 */
function AdminOrdenes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dni = searchParams.get("dni") ?? "";

  const [estadosOrden, setEstadosOrden] = useState([]);
  const [errorEstados, setErrorEstados] = useState(null);
  const [cargandoEstados, setCargandoEstados] = useState(true);
  const [refresco, setRefresco] = useState(0);

  const [movimientoPendiente, setMovimientoPendiente] = useState(null);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState(null);
  const [advertencias, setAdvertencias] = useState([]);
  const [avisoNotificacion, setAvisoNotificacion] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargandoEstados(true);
    getEstadosOrden()
      .then((lista) => {
        if (!activo) return;
        setEstadosOrden(lista);
        setErrorEstados(null);
      })
      .catch((err) => {
        if (!activo) return;
        setErrorEstados(err.message ?? "No se pudieron cargar los estados de las órdenes.");
      })
      .finally(() => {
        if (activo) setCargandoEstados(false);
      });
    return () => {
      activo = false;
    };
  }, [refresco]);

  const { columnas, cargando, cargarMas, moverOrden } = useColumnasOrdenes(estadosOrden, {
    dni,
    refresco,
  });

  // El tab activo vive en la URL para que volver del detalle de una orden caiga
  // en el mismo tab —que es el flujo entero en un celular— y para que el E2E
  // sea determinista. Un valor desconocido cae al primer estado en vez de
  // dejar la pantalla sin columna visible.
  const estadoDeUrl = searchParams.get("estado");
  const estadoActivo = estadosOrden.some((e) => e.valor === estadoDeUrl)
    ? estadoDeUrl
    : (estadosOrden[0]?.valor ?? null);

  function elegirTab(valor) {
    const siguiente = new URLSearchParams(searchParams);
    siguiente.set("estado", valor);
    // `replace`: cambiar de tab es refinar la vista, no navegar. Sin esto,
    // "atrás" necesitaría un toque por cada tab que se miró para salir.
    setSearchParams(siguiente, { replace: true });
  }

  function limpiarFiltroDni() {
    const siguiente = new URLSearchParams(searchParams);
    siguiente.delete("dni");
    setSearchParams(siguiente);
  }

  /**
   * La única puerta de escritura del tablero: la usan por igual un drop entre
   * columnas y un drop sobre un tab en celular.
   */
  function abrirMovimiento(movimiento) {
    setErrorEstado(null);
    setMovimientoPendiente(movimiento);
  }

  async function confirmarMovimiento(notificar) {
    const { ordenId, origen, destino } = movimientoPendiente;

    setErrorEstado(null);
    setAvisoNotificacion(null);
    setAdvertencias([]);
    setGuardandoEstado(true);

    try {
      const respuesta = await actualizarEstadoOrden(ordenId, destino, notificar);
      moverOrden({ ordenId, origen, destino, respuesta });
      // El backend avisa acá cuando el descuento de stock se apoyó en cero: se
      // tomaron MENOS unidades de las que el cliente pidió. Es un faltante real
      // de depósito, y hasta ahora ninguna pantalla lo leía.
      setAdvertencias(respuesta.advertencias ?? []);
      if (respuesta.notificacion && respuesta.notificacion.enviada === false) {
        setAvisoNotificacion(respuesta.notificacion);
      }
      setMovimientoPendiente(null);
    } catch (err) {
      setErrorEstado(err.message ?? "No se pudo actualizar el estado de la orden.");
      // Se cierra el diálogo a propósito, mismo criterio que en el detalle:
      // `DialogoNotificarEstado` no tiene prop de error y el mensaje quedaría
      // tapado por el modal.
      setMovimientoPendiente(null);
    } finally {
      setGuardandoEstado(false);
    }
  }

  const ordenDelMovimiento = movimientoPendiente
    ? (columnas[movimientoPendiente.origen]?.ordenes ?? []).find(
        (o) => o.id === movimientoPendiente.ordenId,
      )
    : null;

  const etiquetaDe = (valor) => estadosOrden.find((e) => e.valor === valor)?.etiqueta ?? valor;

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Órdenes</h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {/* La pantalla donde más rinde: los pedidos entran mientras se la
              mira. Conserva el tab, el DNI y lo que cada columna ya cargó. */}
          <BotonActualizar onActualizar={() => setRefresco((n) => n + 1)} actualizando={cargando} />
          <Link
            to="/catalogo/admin/ordenes/productos-solicitados"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              inventory_2
            </span>
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
        </div>
      </div>

      {advertencias.length > 0 ? (
        <Advertencia titulo="Stock insuficiente" icono="inventory" testId="advertencias-stock">
          <ul className="font-body-md text-body-md flex list-disc flex-col gap-1 pl-5 text-on-surface">
            {advertencias.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Advertencia>
      ) : null}

      {avisoNotificacion ? (
        <Advertencia titulo="El cliente no fue notificado" icono="mark_email_unread">
          <p className="font-body-md text-body-md text-on-surface">
            El estado de la orden se guardó correctamente, pero no se pudo notificar al cliente
            {avisoNotificacion.error ? `: ${avisoNotificacion.error}` : "."}
          </p>
        </Advertencia>
      ) : null}

      {errorEstado ? (
        <div className="mb-6 rounded-xl bg-error-container px-4 py-3">
          <p className="font-body-md text-body-md text-on-error-container">{errorEstado}</p>
        </div>
      ) : null}

      {errorEstados ? (
        <EstadoVacio
          icono="cloud_off"
          titulo="No se pudo cargar el tablero"
          descripcion="Revisá tu conexión e intentá de nuevo."
        />
      ) : (
        // Los tabs los renderiza el tablero: son la zona de destino del
        // arrastre en celular y `useDroppable` solo funciona dentro del
        // `DndContext`.
        <TableroOrdenes
          estados={estadosOrden}
          columnas={columnas}
          estadoActivo={estadoActivo}
          movimientoPendiente={movimientoPendiente}
          onElegirTab={elegirTab}
          onCargarMas={cargarMas}
          onReintentar={() => setRefresco((n) => n + 1)}
          onMovimiento={abrirMovimiento}
        />
      )}

      {!errorEstados && !cargandoEstados && estadosOrden.length === 0 ? (
        <EstadoVacio
          icono="receipt_long"
          titulo="No hay estados de orden configurados"
          descripcion="El tablero necesita al menos un estado para dibujar sus columnas."
        />
      ) : null}

      {movimientoPendiente ? (
        <DialogoNotificarEstado
          ordenId={movimientoPendiente.ordenId}
          estadoAnterior={movimientoPendiente.origen}
          etiquetaAnterior={etiquetaDe(movimientoPendiente.origen)}
          estadoNuevo={movimientoPendiente.destino}
          etiquetaNueva={etiquetaDe(movimientoPendiente.destino)}
          emailCliente={ordenDelMovimiento?.cliente?.email ?? null}
          guardando={guardandoEstado}
          onConfirmar={confirmarMovimiento}
          onCancelar={() => setMovimientoPendiente(null)}
        />
      ) : null}
    </main>
  );
}

export default AdminOrdenes;
