import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import { getOrdenById, actualizarEstadoOrden } from "../../api/ordenes.js";
import { formatFecha, formatPrecio, precioACentavos } from "../../utils/formato.js";
import { ESTADOS_ORDEN, ETIQUETA_ESTADO } from "../../constants/ordenes.js";
import { claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";
import Advertencia from "../../components/admin/Advertencia.jsx";
import DialogoNotificarEstado from "../../components/admin/DialogoNotificarEstado.jsx";

/**
 * `/catalogo/admin/ordenes/:id` — detalle de una orden.
 * El select de estado NO restringe transiciones — cualquiera de los 5
 * estados es siempre seleccionable, sin importar el estado actual (mismo
 * criterio deliberado del backend, ver `ordenes.controller.js`'s
 * `actualizarEstado`).
 *
 * Elegir un estado NO guarda: abre `DialogoNotificarEstado`, donde el admin
 * decide si además se le avisa al cliente por mail. Guardar es siempre una
 * confirmación explícita.
 */
function AdminOrdenDetalle() {
  const { id } = useParams();

  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState(null);
  // Estado pretendido mientras el diálogo está abierto. `null` = cerrado.
  const [estadoPendiente, setEstadoPendiente] = useState(null);
  // Resultado del último intento de notificación, para el aviso de la pantalla.
  const [avisoNotificacion, setAvisoNotificacion] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getOrdenById(id)
      .then((data) => {
        if (!activo) return;
        setOrden(data);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudo cargar la orden.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id]);

  /**
   * El select ya no guarda: abre el diálogo. Guardar sin preguntar le sacaría
   * al admin la decisión de avisarle o no al cliente, que es justo lo que la
   * feature existe para darle.
   *
   * El select queda sin reflejo optimista hasta que se confirme — su `value`
   * sigue atado a `orden.estado`, así que cancelar lo deja donde estaba sin
   * necesidad de revertir nada a mano.
   */
  function handleCambiarEstado(event) {
    const nuevoEstado = event.target.value;
    if (nuevoEstado === orden.estado) return;
    setErrorEstado(null);
    setEstadoPendiente(nuevoEstado);
  }

  function handleCancelarCambio() {
    setEstadoPendiente(null);
  }

  async function handleConfirmarCambio(notificar) {
    const nuevoEstado = estadoPendiente;

    setErrorEstado(null);
    setAvisoNotificacion(null);
    setGuardandoEstado(true);

    try {
      const actualizado = await actualizarEstadoOrden(id, nuevoEstado, notificar);
      setOrden(actualizado);
      // Solo se avisa del fracaso: un envío exitoso no necesita anunciarse,
      // el admin ya sabe que lo pidió.
      if (actualizado.notificacion && actualizado.notificacion.enviada === false) {
        setAvisoNotificacion(actualizado.notificacion);
      }
      setEstadoPendiente(null);
    } catch (err) {
      setErrorEstado(err.message ?? "No se pudo actualizar el estado de la orden.");
      // Se cierra el diálogo a propósito: el mensaje de error se renderiza en
      // la pantalla, y con el modal encima quedaría tapado. Reintentar cuesta
      // volver a elegir el estado en el select, que es barato comparado con un
      // fallo silencioso.
      setEstadoPendiente(null);
    } finally {
      setGuardandoEstado(false);
    }
  }

  if (cargando) {
    return (
      <main className="w-full px-4 py-6 md:px-8 md:py-8">
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando orden…</p>
        </div>
      </main>
    );
  }

  if (error || !orden) {
    return (
      <main className="w-full px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6">
          <BotonVolver fallback="/catalogo/admin/ordenes" />
        </div>
        <EstadoVacio
          icono="error"
          titulo="No se pudo cargar la orden"
          mensaje={error ?? "Orden no encontrada."}
        />
      </main>
    );
  }

  const totalCentavos = orden.items.reduce(
    (total, item) => total + precioACentavos(item.precioUnitario) * item.cantidad,
    0,
  );
  const total = formatPrecio(totalCentavos / 100);

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/ordenes" />
      </div>

      {avisoNotificacion ? (
        <Advertencia titulo="El cliente no fue notificado" icono="mark_email_unread">
          <p className="font-body-md text-body-md text-on-surface">
            El estado de la orden se guardó correctamente, pero no se pudo notificar al cliente
            {avisoNotificacion.error ? `: ${avisoNotificacion.error}` : "."}
          </p>
        </Advertencia>
      ) : null}

      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Orden #{orden.id}</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={orden.estado}
            onChange={handleCambiarEstado}
            disabled={guardandoEstado}
            aria-label="Cambiar estado de la orden"
            className="font-body-md text-body-md rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none disabled:opacity-60"
          >
            {ESTADOS_ORDEN.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
          {guardandoEstado ? <Spinner className="h-5 w-5 text-on-surface-variant" /> : null}
        </div>
      </div>

      {errorEstado ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {errorEstado}
        </p>
      ) : null}

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-surface-container-lowest p-6 shadow-ambient">
          <h2 className="font-headline-md text-headline-md mb-4 text-on-background">Cliente</h2>
          <dl className="flex flex-col gap-2">
            <div className="flex justify-between gap-4">
              <dt className="font-body-md text-body-md text-on-surface-variant">Nombre</dt>
              <dd className="font-body-md text-body-md text-on-surface">{orden.cliente.nombre}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-body-md text-body-md text-on-surface-variant">DNI</dt>
              <dd className="font-body-md text-body-md text-on-surface">
                <Link
                  to={`/catalogo/admin/ordenes?dni=${orden.cliente.dni}`}
                  className="text-secondary hover:underline"
                >
                  {orden.cliente.dni}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-body-md text-body-md text-on-surface-variant">Teléfono</dt>
              <dd className="font-body-md text-body-md text-on-surface">{orden.cliente.telefono}</dd>
            </div>
            {orden.cliente.email ? (
              <div className="flex justify-between gap-4">
                <dt className="font-body-md text-body-md text-on-surface-variant">Email</dt>
                <dd className="font-body-md text-body-md text-on-surface">{orden.cliente.email}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="font-body-md text-body-md text-on-surface-variant">Fecha</dt>
              <dd className="font-body-md text-body-md text-on-surface">{formatFecha(orden.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {orden.notas ? (
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-ambient">
            <h2 className="font-headline-md text-headline-md mb-4 text-on-background">Notas</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{orden.notas}</p>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
        <table role="table" className={`${claseTablaApilada} w-full min-w-[560px] text-left`}>
          <thead role="rowgroup">
            <tr role="row" className="border-b border-outline-variant">
              <th role="columnheader" className={claseEncabezado}>
                Producto
              </th>
              <th role="columnheader" className={claseEncabezado}>
                Precio unitario
              </th>
              <th role="columnheader" className={claseEncabezado}>
                Cantidad
              </th>
              <th role="columnheader" className={claseEncabezado}>
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {orden.items.map((item) => (
              <tr key={item.id} role="row" className="border-b border-outline-variant last:border-b-0">
                <td role="cell" data-celda="identidad" className="font-body-md text-body-md px-4 py-3 text-on-surface">{item.nombreProducto}</td>
                <td role="cell" data-label="Precio unitario" className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                  {formatPrecio(item.precioUnitario)}
                </td>
                <td role="cell" data-label="Cantidad" className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{item.cantidad}</td>
                <td role="cell" data-label="Subtotal" className="font-body-md text-body-md px-4 py-3 text-on-surface">
                  {formatPrecio((precioACentavos(item.precioUnitario) * item.cantidad) / 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
          <span className="font-headline-md text-headline-md text-primary">Total</span>
          <strong className="font-headline-md text-headline-md text-primary">{total}</strong>
        </div>
      </div>

      {estadoPendiente !== null ? (
        <DialogoNotificarEstado
          ordenId={orden.id}
          estadoAnterior={orden.estado}
          estadoNuevo={estadoPendiente}
          emailCliente={orden.cliente?.email ?? null}
          guardando={guardandoEstado}
          onConfirmar={handleConfirmarCambio}
          onCancelar={handleCancelarCambio}
        />
      ) : null}
    </main>
  );
}

export default AdminOrdenDetalle;
