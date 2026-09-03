import { useDroppable } from "@dnd-kit/core";
import { ESTILOS_ESTADO, ESTILO_ESTADO_POR_DEFECTO } from "../../../constants/ordenes.js";
import Spinner from "../../Spinner.jsx";
import TarjetaOrden from "./TarjetaOrden.jsx";

/**
 * Una columna del tablero: un estado de orden y las órdenes que están en él.
 *
 * **El contador del encabezado sale del `total` del servidor, no del largo de
 * la lista.** Es la diferencia entre "hay 140 entregadas" y "cargué 15": con lo
 * segundo, una columna paginada mentiría sobre el volumen real del negocio.
 *
 * ⚠️ **No lleva `overflow-y-auto`**, y no es un olvido: el panel de resumen de
 * cada tarjeta se posiciona `absolute` dentro de ella, así que un contenedor
 * con scroll lo recortaría — y de paso le daría a dnd-kit un scroll container
 * extra que administrar durante el arrastre. La altura la acota "Cargar más".
 *
 * Distingue los CUATRO estados de la carga, no dos: cargando, error (con
 * reintento), vacío, y con datos. Un error dibujado como "no hay órdenes" le
 * diría al admin que no tiene pedidos cuando lo que pasó es que se cayó la red.
 */
export default function ColumnaOrdenes({
  estado,
  columna,
  onCargarMas,
  onReintentar,
  resumenAbiertoId,
  onAlternarResumen,
  ordenArrastrada,
  className = "",
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.valor });
  const estilo = ESTILOS_ESTADO[estado.valor] ?? ESTILO_ESTADO_POR_DEFECTO;
  const hayMas = columna.ordenes.length < columna.total;

  return (
    <section
      aria-label={`${estado.etiqueta}: ${columna.total} ${columna.total === 1 ? "orden" : "órdenes"}`}
      className={`flex min-w-0 flex-col rounded-xl border border-outline-variant bg-surface-container-low ${className}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-outline-variant px-3 py-2">
        <span className={`font-label-sm text-label-sm rounded-lg px-2 py-1 uppercase tracking-widest ${estilo}`}>
          {estado.etiqueta}
        </span>
        <span className="font-label-md text-label-md text-on-surface-variant">{columna.total}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-3 p-3 transition-colors ${
          isOver ? "bg-primary-container" : ""
        }`}
      >
        {columna.cargando ? (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        ) : null}

        {!columna.cargando && columna.error ? (
          <div className="flex flex-col items-start gap-2 py-4">
            <p className="font-body-md text-body-md text-on-surface-variant">
              No se pudieron cargar estas órdenes.
            </p>
            <button
              type="button"
              onClick={() => onReintentar(estado.valor)}
              className="font-label-sm text-label-sm rounded-lg border border-outline px-3 py-2 uppercase tracking-widest text-primary"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!columna.cargando && !columna.error && columna.ordenes.length === 0 ? (
          <p className="font-body-md text-body-md py-4 text-on-surface-variant">Sin órdenes acá.</p>
        ) : null}

        {columna.ordenes.map((orden) => (
          <TarjetaOrden
            key={orden.id}
            orden={orden}
            resumenAbierto={resumenAbiertoId === orden.id}
            onAlternarResumen={onAlternarResumen}
            arrastrando={ordenArrastrada === orden.id}
          />
        ))}

        {hayMas ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onCargarMas(estado.valor)}
              disabled={columna.cargandoPagina}
              className="font-label-sm text-label-sm rounded-lg border border-outline px-3 py-2 uppercase tracking-widest text-primary disabled:opacity-50"
            >
              {columna.cargandoPagina ? "Cargando…" : "Cargar más"}
            </button>
            {/* El error de "cargar más" va pegado al botón y NO vacía la
                columna: lo que ya se vio se queda, y reintentar es volver a
                tocarlo. */}
            {columna.errorPagina ? (
              <p className="font-label-sm text-label-sm text-error">{columna.errorPagina}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
