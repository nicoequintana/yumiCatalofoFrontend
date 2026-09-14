import { useEffect } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { formatFecha, formatPrecio } from "../../utils/formato.js";
import usePedidosCliente from "../../hooks/usePedidosCliente.js";
import { precargarPedidoDetalle } from "./cargarPedidoDetalle.js";

const MENSAJE_ERROR = "Revisá tu conexión e intentá de nuevo.";

function MisPedidos() {
  // Cache + refetch en segundo plano, mismo patrón que `useProductosCarrito`
  // (`Carrito.jsx`/`Checkout.jsx`): sin esto, cada remontaje de esta pantalla
  // arrancaba vacío y pintaba nada (`return null`) durante el viaje de red —
  // el mismo ghosting al ir y volver de `/cuenta` que ya se midió y resolvió
  // en el carrito y el checkout.
  const { pedidos, cargando, error, recargar } = usePedidosCliente();

  // Precarga el chunk del detalle (lazy en `App.jsx`): abrir un pedido no
  // pinta el spinner de Suspense del guard. Mismo patrón que `MiCuenta.jsx`.
  useEffect(() => {
    precargarPedidoDetalle();
  }, []);

  if (cargando) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EstadoVacio icono="cloud_off" titulo="No pudimos cargar tus pedidos" mensaje={MENSAJE_ERROR} />
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

  if (pedidos.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hiciste ningún pedido"
        mensaje="Cuando compres algo, lo vas a ver acá."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <BotonVolver fallback="/cuenta" destinoFijo etiqueta="Volver a mi cuenta" />
      <h1 className="font-display-lg text-headline-lg text-on-background">Mis pedidos</h1>
      <ul className="flex flex-col gap-4">
        {pedidos.map((pedido) => (
          <li key={pedido.id}>
            <Link
              to={`/cuenta/pedidos/${pedido.id}`}
              className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
            >
              <span className="text-label-md text-on-surface">Pedido #{pedido.id}</span>
              <span className="text-body-md text-on-surface-variant">
                {formatFecha(pedido.createdAt)} · {pedido.estadoEtiqueta}
              </span>
              <span className="text-body-md text-on-surface">{formatPrecio(pedido.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MisPedidos;
