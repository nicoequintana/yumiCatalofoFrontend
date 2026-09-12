import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { formatFecha, formatPrecio } from "../../utils/formato.js";
import { getPedidoPorId } from "../../api/cuenta.js";

function PedidoDetalle() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  function cargar() {
    setCargando(true);
    setError(null);
    setNoEncontrado(false);
    getPedidoPorId(id)
      .then((body) => {
        setPedido(body);
      })
      .catch((err) => {
        if (err?.status === 404) {
          setNoEncontrado(true);
        } else {
          // Falló la carga, distinto de "no existe": no se pisa un 404 con un
          // error de red, cada caso muestra un mensaje propio.
          setError("Revisá tu conexión e intentá de nuevo.");
        }
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
    // Solo al montar (o si cambia el id de la ruta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        <EstadoVacio icono="cloud_off" titulo="No pudimos cargar el pedido" mensaje={error} />
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <div className="flex flex-col gap-1">
        <h1 className="font-display-lg text-headline-lg text-on-background">
          Pedido #{pedido.id}
        </h1>
        <span className="text-body-md text-on-surface-variant">
          {formatFecha(pedido.createdAt)} · {pedido.estadoEtiqueta}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {pedido.items.map((item, indice) => (
          // eslint-disable-next-line react/no-array-index-key -- el backend no manda un id por item
          <li
            key={indice}
            className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-body-md text-on-surface">{item.nombreProducto}</span>
              <span className="text-body-md text-on-surface-variant">
                {item.cantidad} × {formatPrecio(item.precioUnitario)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {pedido.notas ? (
        <p className="text-body-md text-on-surface-variant">{pedido.notas}</p>
      ) : null}

      <span className="text-title-md text-on-surface">Total: {formatPrecio(pedido.total)}</span>
    </div>
  );
}

export default PedidoDetalle;
