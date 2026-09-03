import { estiloDeCampania } from "../../../constants/campanias.js";
import {
  DIAS_SEMANA,
  claveDeDia,
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
 * SIN LIBRERÍA, y no por ahorro de bytes: el frontend tiene una sola
 * dependencia de runtime además de React (`@dnd-kit/core`), y una grilla
 * mensual con barras de período son ~150 líneas de matemática que ya vive
 * probada en `calendario.js`. Meter un `react-big-calendar` traería su propio
 * sistema de estilos para pelearse con los tokens del panel.
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
  campanias,
  claveHoy,
  onSeleccionarDia,
  onSeleccionarCampania,
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
            className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => onCambiarMes(null)}
            className="font-label-md text-label-md rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => onCambiarMes(desplazarMes(mesVisible, 1))}
            aria-label="Mes siguiente"
            className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
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
          const tramos = tramosDeLaSemana(campanias, semana);
          // El alto de la fila lo fija la cantidad de carriles ocupados: una
          // semana sin campañas no reserva espacio vacío, y una con cinco
          // superpuestas no las recorta.
          const carriles = tramos.reduce((max, t) => Math.max(max, t.carril + 1), 0);

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
                      style={{ minHeight: `${3.5 + carriles * 1.75}rem` }}
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
                {tramos.map(({ campania, columna, span, carril }) => {
                  const estilo = estiloDeCampania(campania);

                  return (
                    <button
                      key={campania.id}
                      type="button"
                      onClick={() => onSeleccionarCampania(campania)}
                      style={{ gridColumn: `${columna} / span ${span}`, gridRow: carril + 1 }}
                      title={`${campania.nombre} · ${campania.etiquetaEstado} · ${campania.etiquetaTemporal}`}
                      className={`font-label-sm text-label-sm pointer-events-auto flex items-center gap-1 overflow-hidden rounded px-2 py-1 text-left transition-opacity hover:opacity-80 ${estilo.barra}`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                        {estilo.icono}
                      </span>
                      <span className="truncate">{campania.nombre}</span>
                      <span className="sr-only">
                        {`, ${campania.etiquetaEstado}, ${campania.etiquetaTemporal}`}
                      </span>
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
