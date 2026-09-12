import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { formatFecha, formatPrecio } from "../../utils/formato.js";
import { getPedidos } from "../../api/cuenta.js";

function MisPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  function cargar() {
    setCargando(true);
    setError(null);
    getPedidos()
      .then((body) => {
        setPedidos(body?.data ?? []);
      })
      .catch(() => {
        // Falló la carga, no está vacío: no se pisa `pedidos` con `[]`, así
        // no se muestra por un instante el estado vacío antes del de error.
        setError("Revisá tu conexión e intentá de nuevo.");
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EstadoVacio icono="cloud_off" titulo="No pudimos cargar tus pedidos" mensaje={error} />
        <button
          type="button"
          onClick={cargar}
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
