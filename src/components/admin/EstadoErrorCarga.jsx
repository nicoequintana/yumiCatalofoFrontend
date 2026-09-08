import EstadoVacio from "../EstadoVacio.jsx";
import { MENSAJE_ERROR_CARGA } from "../../hooks/useOfertas.js";

/**
 * El estado de "no se pudo cargar" de una pantalla del panel: ícono
 * `cloud_off`, título propio de la pantalla, el mensaje COMPARTIDO y un botón
 * para volver a intentar.
 *
 * Existe porque las pantallas de analítica (`AdminVentas`, `AdminClientes`,
 * `AdminEmbudo`, `AdminOperacion`) y `AdminPromociones` le mostraban al
 * operador el error crudo del sistema: `Failed to fetch` —la excepción del
 * navegador, en inglés— con la API caída, y `Error interno` —el string del
 * backend— con un 500. Ninguno de los dos dice qué hacer, y el resto del panel
 * ya resolvía lo mismo con `EstadoVacio` + `cloud_off`. Copiar ese bloque en
 * cinco pantallas más lo habría vuelto una sincronización manual: acá tiene una
 * sola casa.
 *
 * **El mensaje NO es un parámetro.** Es el copy compartido de
 * `MENSAJE_ERROR_CARGA` — el mismo que ya usan `AdminOrdenes` y `RielOfertas`—,
 * justamente para que no vuelva a colarse el texto del sistema por esta puerta.
 * Lo que sí cambia por pantalla es el TÍTULO, que es lo que nombra qué no se
 * pudo traer.
 *
 * `onReintentar` es opcional: una pantalla que ya ofrece otra forma de volver a
 * pedir (un selector de período, por ejemplo) puede omitirlo. Cuando viene, el
 * botón compensa con un margen negativo el `py-24` de `EstadoVacio`: sin eso
 * quedan casi cien píxeles muertos entre el mensaje y la única acción posible.
 */
function EstadoErrorCarga({ titulo, onReintentar }) {
  return (
    <div className="flex w-full flex-col items-center">
      <EstadoVacio icono="cloud_off" titulo={titulo} mensaje={MENSAJE_ERROR_CARGA} />
      {onReintentar ? (
        <button
          type="button"
          onClick={onReintentar}
          className="font-label-md text-label-md -mt-16 mb-16 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export default EstadoErrorCarga;
