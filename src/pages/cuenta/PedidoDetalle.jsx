import { useParams } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import ProductosDeCombo from "../../components/ProductosDeCombo.jsx";
import { formatFecha, formatPrecio } from "../../utils/formato.js";
import { usePedidoCliente } from "../../hooks/usePedidosCliente.js";

const MENSAJE_ERROR = "Revisá tu conexión e intentá de nuevo.";

function PedidoDetalle() {
  const { id } = useParams();
  // Stale-while-revalidate, mismo patrón que `MisPedidos`: un pedido ya visto
  // se pinta entero al instante, y uno abierto desde el listado arranca con el
  // resumen que ya trajo el listado (cabecera y total) mientras llegan los
  // items. Antes arrancaba SIEMPRE en blanco (`return null`) durante el viaje
  // de red: el ghosting de listado → detalle medido el 14/09/2026.
  const { pedido, cargando, error, noEncontrado, recargar } = usePedidoCliente(id);

  if (cargando) return null;

  if (noEncontrado) {
    return (
      <EstadoVacio
        icono="search_off"
        titulo="No encontramos ese pedido"
        mensaje="Puede que ya no exista o que no sea tuyo."
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EstadoVacio icono="cloud_off" titulo="No pudimos cargar el pedido" mensaje={MENSAJE_ERROR} />
        <button
          type="button"
          onClick={recargar}
          className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <BotonVolver fallback="/cuenta/pedidos" destinoFijo etiqueta="Volver a mis pedidos" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display-lg text-headline-lg text-on-background">
          Pedido #{pedido.id}
        </h1>
        <span className="text-body-md text-on-surface-variant">
          {formatFecha(pedido.createdAt)} · {pedido.estadoEtiqueta}
        </span>
      </div>

      {/* Sin `lineas` todavía = el resumen del listado: la lista entra con el
          refetch, sin placeholder de carga. */}
      {pedido.lineas ? (
        <ul className="flex flex-col gap-3">
          {pedido.lineas.map((linea, indice) => (
            // eslint-disable-next-line react/no-array-index-key -- el backend no manda un id por item
            <li
              key={indice}
              className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
            >
              {linea.tipo === "COMBO" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-body-md text-on-surface">
                    {linea.comboNombre} × {linea.comboCantidad} — {formatPrecio(linea.total)}
                  </span>
                  <ProductosDeCombo productos={linea.productos} className="text-body-md text-on-surface-variant" />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-body-md text-on-surface">{linea.item.nombreProducto}</span>
                  <span className="text-body-md text-on-surface-variant">
                    {linea.item.cantidad} × {formatPrecio(linea.item.precioUnitario)}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {pedido.notas ? (
        <p className="text-body-md text-on-surface-variant">{pedido.notas}</p>
      ) : null}

      <span className="text-title-md text-on-surface">Total: {formatPrecio(pedido.total)}</span>
    </div>
  );
}

export default PedidoDetalle;
