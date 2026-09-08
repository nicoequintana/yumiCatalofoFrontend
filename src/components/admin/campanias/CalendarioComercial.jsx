import { estiloDeCampania, estiloDeProgramacion } from "../../../constants/campanias.js";
import {
  DIAS_SEMANA,
  claveDeDia,
  claveDeElemento,
  desplazarMes,
  esDelMes,
  esHoy,
  etiquetaDeMes,
  semanasDelMes,
  tramosDeLaSemana,
} from "./calendario.js";

/**
 * El calendario comercial: qué campaña ocupa qué días.
 *
 * SIN LIBRERÍA, y no por ahorro de bytes: el frontend no tiene NINGUNA
 * dependencia de runtime además de React y el router, y una grilla mensual con
 * barras de período son ~150 líneas de matemática que ya vive probada en
 * `calendario.js`. Meter un `react-big-calendar` traería su propio sistema de
 * estilos para pelearse con los tokens del panel.
 *
 * Este párrafo nombraba a `@dnd-kit/core` como esa única dependencia extra.
 * Entró con el tablero Kanban de órdenes y se fue con él el 07/09/2026, cuando
 * esa pantalla volvió a ser una grilla: era su único consumidor en todo el
 * repo. El argumento de no sumar librerías queda ahora sin ninguna excepción
 * que lo matice.
 *
 * CÓMO SE ARMA CADA SEMANA. Dos capas superpuestas:
 *
 * 1. la grilla de días, que es el fondo y recibe los clicks para crear;
 * 2. las barras de campaña, posicionadas con `grid-column` sobre esa grilla.
 *
 * La capa de barras es `pointer-events-none` y cada barra la reactiva: así el
 * hueco entre barras sigue siendo un día clickeable, y no un agujero muerto.
 *
 * ACCESIBILIDAD. El estado nunca se comunica solo con color — cada barra lleva
 * ícono y texto, y el `title` completa el detalle. Es un requisito del pedido y
 * además lo que hace que el calendario siga siendo legible en una captura en
 * blanco y negro.
 */
export default function CalendarioComercial({
  mesVisible,
  onCambiarMes,
  elementos,
  claveHoy,
  onSeleccionarDia,
  onSeleccionar,
}) {
  const semanas = semanasDelMes(mesVisible.ano, mesVisible.mes);

  return (
    <section aria-label="Calendario comercial">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-headline-sm text-headline-sm text-primary">
          {etiquetaDeMes(mesVisible)}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCambiarMes(desplazarMes(mesVisible, -1))}
            aria-label="Mes anterior"
            className={`${claseNavegacion} p-2`}
          >
            <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => onCambiarMes(null)}
            className={`font-label-md text-label-md ${claseNavegacion} px-4 py-2 uppercase tracking-widest`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => onCambiarMes(desplazarMes(mesVisible, 1))}
            aria-label="Mes siguiente"
            className={`${claseNavegacion} p-2`}
          >
            <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
              chevron_right
            </span>
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low">
          {DIAS_SEMANA.map((dia) => (
            <span
              key={dia}
              className="font-label-sm text-label-sm px-2 py-2 text-center uppercase tracking-widest text-on-surface-variant"
            >
              {dia}
            </span>
          ))}
        </div>

        {semanas.map((semana) => {
          const tramos = tramosDeLaSemana(elementos, semana);
          // El alto de la fila lo fija la cantidad de carriles ocupados: una
          // semana sin campañas no reserva espacio vacío, y una con cinco
          // superpuestas no las recorta.
          const carriles = tramos.reduce((max, t) => Math.max(max, t.carril + 1), 0);
          const altoDeFila = ALTO_ENCABEZADO_REM + carriles * ALTO_CARRIL_REM;

          return (
            <div key={claveDeDia(semana[0])} className="relative border-b border-outline-variant last:border-b-0">
              <div className="grid grid-cols-7">
                {semana.map((dia) => {
                  const clave = claveDeDia(dia);
                  const delMes = esDelMes(dia, mesVisible.mes);

                  return (
                    <button
                      key={clave}
                      type="button"
                      onClick={() => onSeleccionarDia(clave)}
                      style={{ minHeight: `${altoDeFila}rem` }}
                      // `flex flex-col items-start` no es decorativo: un
                      // <button> centra su contenido por defecto, así que sin
                      // esto el número del día se planta en el MEDIO de la
                      // celda y las barras de campaña —que se posicionan desde
                      // arriba— se lo comen.
                      className={`flex flex-col items-start border-r border-outline-variant p-2 text-left transition-colors last:border-r-0 hover:bg-surface-container ${
                        delMes ? "" : "bg-surface-container-low"
                      }`}
                    >
                      <span
                        className={`font-label-md text-label-md inline-flex h-6 w-6 items-center justify-center rounded-full ${
                          esHoy(dia, claveHoy)
                            ? "bg-primary text-on-primary"
                            : delMes
                              ? "text-on-surface"
                              : "text-on-surface-variant/60"
                        }`}
                      >
                        {dia.getUTCDate()}
                      </span>
                      <span className="sr-only">
                        {delMes ? "Crear campaña este día" : "Día de otro mes"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Capa de barras. `pointer-events-none` para que el hueco entre
                  dos barras siga siendo un día clickeable; cada barra los
                  reactiva para sí misma. */}
              <div className="pointer-events-none absolute inset-x-0 top-9 grid grid-cols-7 gap-y-1 px-1">
                {tramos.map(({ campania: elemento, columna, span, carril }) => {
                  // Dos cosas distintas comparten la grilla: una campaña es una
                  // experiencia comercial completa, una programación es un
                  // descuento con fecha. Se distinguen por forma e ícono, no
                  // solo por color.
                  const esPromocion = elemento.tipo === "PROMOCION";
                  const estilo = esPromocion
                    ? estiloDeProgramacion(elemento)
                    : estiloDeCampania(elemento);
                  const detalle = esPromocion
                    ? elemento.habilitada
                      ? "Promoción programada"
                      : "Promoción programada, apagada"
                    : `${elemento.etiquetaEstado} · ${elemento.etiquetaTemporal}`;

                  return (
                    <button
                      key={claveDeElemento(elemento)}
                      type="button"
                      onClick={() => onSeleccionar(elemento)}
                      style={{ gridColumn: `${columna} / span ${span}`, gridRow: carril + 1 }}
                      title={`${elemento.nombre} · ${detalle}`}
                      className={`font-label-sm text-label-sm pointer-events-auto flex min-h-11 items-center gap-1 overflow-hidden rounded px-2 py-1 text-left transition-opacity hover:opacity-80 ${estilo.barra}`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                        {estilo.icono}
                      </span>
                      <span className="truncate">{elemento.nombre}</span>
                      <span className="sr-only">{`, ${detalle}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * La caja compartida de los tres controles de mes (anterior, «Hoy», siguiente).
 *
 * `min-h-11 min-w-11` (44px) va **ADEMÁS** del `p-2` / `px-4 py-2` de cada uno,
 * nunca en lugar de él: el mínimo táctil de WCAG 2.5.8 es un PISO y el padding
 * sigue decidiendo cuánto crece por encima (mismo criterio que
 * `SelectorCantidad.jsx`). Medido en navegador el 07/09/2026 a 1280×800 con
 * `elementFromPoint` —área EFECTIVA, no la caja declarada—: las flechas daban
 * 39×39 y 38×39, y «Hoy» 70×36.
 *
 * Acá se puede crecer de verdad —son tres botones sueltos en el encabezado, con
 * `gap-2` entre ellos—, así que no hace falta el pseudo-elemento de
 * `utils/areaTactil.js`: agrandar la caja no empuja nada.
 *
 * El `inline-flex items-center justify-center` va explícito porque con
 * `min-height` el contenido del `<button>` deja de estar centrado por el
 * padding.
 */
const claseNavegacion =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface";

/**
 * El alto que reserva la celda de un día, en `rem`.
 *
 * ── POR QUÉ EL CARRIL MIDE 3rem Y NO 1.75 (07/09/2026) ──
 *
 * Las barras miden ahora 44 de alto (`min-h-11`), contra los 23-26 que medía el
 * área efectiva de cada una antes de la auditoría de accesibilidad táctil. La
 * decisión de fondo fue **darles alto REAL en vez de un pseudo-elemento**, y
 * acá está el motivo: las barras se APILAN dentro de la celda de un día, una
 * por carril. Con un pseudo-elemento de 44 sobre un paso de 28, cada área se
 * comería la del carril de arriba —el de más abajo en el DOM gana— y encima
 * taparía el hueco entre barras, que este calendario mantiene clickeable a
 * propósito para poder crear una campaña en ese día (ver la capa
 * `pointer-events-none`). O sea: el pseudo-elemento no solo no alcanzaba,
 * rompía una interacción que ya funcionaba.
 *
 * Con alto real hay que agrandar el paso en la misma medida, o el carril
 * siguiente se solapa igual: 44 de barra + 4 del `gap-y-1` = 48px = **3rem**.
 * Tampoco se limita cuántas barras entran por día: recortarlas escondería
 * campañas vigentes, que es peor que una fila alta en una pantalla que ya es
 * solo escritorio y tiene scroll vertical.
 *
 * `ALTO_ENCABEZADO_REM` es el espacio del número del día (la capa de barras
 * arranca en `top-9`) más el margen de abajo.
 */
const ALTO_ENCABEZADO_REM = 3.5;
const ALTO_CARRIL_REM = 3;
