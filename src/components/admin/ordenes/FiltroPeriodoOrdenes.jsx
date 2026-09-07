import { claseToggleOrdenes } from "./claseToggleOrdenes.js";

/**
 * Ventanas de tiempo del listado de órdenes.
 *
 * No se exporta: la pantalla solo necesita saber qué eligió el admin, no de
 * qué lista salió. Mantenerla privada deja además el archivo exportando un
 * único componente, como pide la regla de Fast Refresh.
 *
 * `null` es el preset "Todo": la ausencia de los tres parámetros.
 */
const PRESETS = [
  { dias: "1", etiqueta: "Hoy" },
  { dias: "7", etiqueta: "7 días" },
  { dias: "30", etiqueta: "30 días" },
  { dias: null, etiqueta: "Todo" },
];

const CLASE_FECHA =
  "font-body-md text-body-md min-h-11 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none";

/**
 * El `max` de los dos inputs: hoy, en la fecha LOCAL del navegador.
 *
 * ⚠️ Es un tope de INPUT, no una definición de "día" del sistema. Esa la manda
 * el backend (día argentino, `lib/horarioArgentino.js`) y el frontend no la
 * calcula: un `-3` escrito acá sería una segunda casa de la misma regla, que se
 * desincroniza sin que nada falle. Lo único que este tope tiene que impedir es
 * tipear un año futuro, y para eso la fecha local alcanza — como mucho difiere
 * en un día del día argentino, y ese día lo sigue decidiendo el backend.
 *
 * Existe porque sin `max` un `hasta` mal tipeado (2030) hace que el backend
 * conserve ese fin y corra el inicio: queda una ventana entera EN EL FUTURO,
 * con cero órdenes y un aviso que nombra fechas que todavía no pasaron.
 */
function hoyLocal() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Filtro de período del listado de órdenes: cuatro presets más un rango libre.
 *
 * **No reusa `SelectorPeriodo`, y eso es deliberado.** Ese componente ofrece
 * 7/30/90 fijos, no tiene "Hoy", no tiene "Todo" y no tiene rango libre — y lo
 * comparten las CUATRO pantallas de analytics, así que agregarle opciones acá
 * las cambiaría a todas. Lo que sí se copia es su patrón de markup: botones con
 * `aria-pressed` dentro de un `role="group"`, nunca un `role="tablist"`.
 *
 * **Presets y rango libre son excluyentes en la UI, aunque el backend sepa
 * desempatarlos** (allá las fechas explícitas le ganan a `dias`). Elegir un
 * preset borra las fechas y escribir una fecha borra el preset: sin eso queda
 * un chip pintado como activo que no es el que manda sobre lo que se ve, que
 * es exactamente la clase de mentira silenciosa que el panel tiene prohibida.
 *
 * Presentacional puro: no toca la URL ni pide datos. Emite el cambio y quien
 * lo consume decide (`null` = borrar ese parámetro).
 *
 * @param {object} props
 * @param {string} props.idRotulo - el `id` del rótulo VISIBLE ("Período") que
 *   la pantalla dibuja arriba. De ahí sale el nombre accesible del grupo: con
 *   un `aria-label` propio además del rótulo, `aria-labelledby` gana y el
 *   `aria-label` queda muerto — un nombre escrito que nadie oye. Mismo
 *   criterio que el grupo de chips de Estado.
 * @param {string} props.dias - el `?dias=` vigente, `""` si no hay.
 * @param {string} props.desde - el `?desde=` vigente (`AAAA-MM-DD`), `""` si no hay.
 * @param {string} props.hasta - el `?hasta=` vigente, `""` si no hay.
 * @param {(cambios: {dias?: string|null, desde?: string|null, hasta?: string|null}) => void} props.onCambiar
 */
function FiltroPeriodoOrdenes({ idRotulo, dias, desde, hasta, onCambiar }) {
  // Un rango libre apaga los cuatro presets, "Todo" incluido: con fechas
  // puestas, ninguno describe lo que se está viendo.
  const hayRangoLibre = Boolean(desde || hasta);
  const maximo = hoyLocal();

  function presetActivo(preset) {
    if (hayRangoLibre) return false;
    if (preset.dias === null) return !dias;
    return dias === preset.dias;
  }

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div role="group" aria-labelledby={idRotulo} className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.etiqueta}
            type="button"
            aria-pressed={presetActivo(preset)}
            onClick={() => onCambiar({ dias: preset.dias, desde: null, hasta: null })}
            className={claseToggleOrdenes(presetActivo(preset))}
          >
            {preset.etiqueta}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="periodo-ordenes-desde"
            className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            Desde
          </label>
          <input
            id="periodo-ordenes-desde"
            type="date"
            value={desde}
            max={maximo}
            // Una fecha vacía se BORRA de la URL en vez de viajar como `""`:
            // el cliente de API descarta los vacíos igual, pero dejarla escrita
            // ensucia el link que el admin comparte.
            onChange={(e) => onCambiar({ desde: e.target.value || null, dias: null })}
            className={CLASE_FECHA}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="periodo-ordenes-hasta"
            className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            Hasta
          </label>
          <input
            id="periodo-ordenes-hasta"
            type="date"
            value={hasta}
            max={maximo}
            onChange={(e) => onCambiar({ hasta: e.target.value || null, dias: null })}
            className={CLASE_FECHA}
          />
        </div>
      </div>
    </div>
  );
}

export default FiltroPeriodoOrdenes;
