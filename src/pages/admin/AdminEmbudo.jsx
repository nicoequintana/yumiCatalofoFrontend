import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getEmbudoConversion } from "../../api/adminEmbudo.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Ancho mínimo de barra, para que una etapa en cero siga siendo visible. */
const ANCHO_MINIMO = 6;

/** `Date` -> "YYYY-MM-DD", el formato que espera el backend. */
function aClaveDia(fecha) {
  return fecha.toISOString().slice(0, 10);
}

/** Rango [hoy - (dias-1), hoy], ambos inclusive. */
function calcularRango(dias) {
  const hoy = new Date();
  const hasta = new Date(`${aClaveDia(hoy)}T00:00:00.000Z`);
  const desde = new Date(hasta.getTime() - (dias - 1) * MS_POR_DIA);
  return { desde: aClaveDia(desde), hasta: aClaveDia(hasta) };
}

/** "2026-08-19" -> "19/08/2026", el formato de fecha que usa la app. */
function formatFecha(fecha) {
  if (typeof fecha !== "string" || fecha.length < 10) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** 1000 -> "1.000", separador de miles argentino. */
function formatEntero(cantidad) {
  return new Intl.NumberFormat("es-AR").format(cantidad ?? 0);
}

/**
 * Tasa (0..1) -> "20,0%".
 *
 * Una tasa `null` es una tasa NO CALCULABLE, no un cero: pasa cuando la etapa
 * anterior no tiene eventos (no hay denominador) o cuando esta etapa tiene más
 * eventos que la anterior — imposible en un embudo real, señal de que las dos
 * etapas no cubren el mismo período de registro. Se muestra "—" a propósito:
 * un porcentaje inventado ahí sería mentira, y un "0%" también.
 */
function formatTasa(tasa) {
  if (tasa === null || tasa === undefined) return "—";
  return `${(tasa * 100).toFixed(1).replace(".", ",")}%`;
}

/**
 * Embudo en barras horizontales proporcionales, en CSS puro.
 *
 * A propósito sin librería de gráficos, misma línea que `GraficoIngresos` en
 * `AdminVentas.jsx`: cuatro barras no justifican sumar un bundle entero.
 *
 * Las barras se escalan contra la etapa MÁS GRANDE del embudo, no contra la
 * primera: cuando los datos están sesgados (una etapa registrando desde antes
 * que otra), la primera puede no ser la mayor, y escalar contra ella daría
 * barras desbordadas.
 */
function GraficoEmbudo({ etapas }) {
  const maximo = etapas.reduce(
    (mayor, etapa) => Math.max(mayor, etapa.cantidad),
    0,
  );

  return (
    <div data-testid="grafico-embudo" className="flex flex-col gap-3">
      {etapas.map((etapa, indice) => {
        const ancho =
          maximo > 0
            ? Math.max((etapa.cantidad / maximo) * 100, ANCHO_MINIMO)
            : ANCHO_MINIMO;

        return (
          <div key={etapa.clave} className="flex flex-col gap-1">
            {indice > 0 ? (
              <div className="flex items-center gap-2 pl-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">
                  south
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest">
                  {formatTasa(etapa.tasaDesdeAnterior)}
                </span>
                {!etapa.tasaCalculable ? (
                  <span className="font-body-md text-body-md">
                    tasa no calculable para este período
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex w-full items-center gap-3 sm:w-56 sm:shrink-0">
                <span className="font-body-md text-body-md text-on-surface">
                  {etapa.etiqueta}
                </span>
                {etapa.subregistrada ? (
                  <span
                    data-testid="etapa-subregistrada"
                    title={
                      etapa.registraDesde
                        ? `Se registra desde el ${formatFecha(etapa.registraDesde)}`
                        : "Todavía no se registró ningún evento de esta etapa"
                    }
                    className="font-label-sm text-label-sm rounded-full bg-tertiary-container px-2 py-1 uppercase tracking-widest text-on-surface"
                  >
                    Parcial
                  </span>
                ) : null}
              </div>

              <div className="flex w-full items-center gap-3">
                <div
                  className="h-8 min-w-0 rounded-md bg-primary"
                  style={{ width: `${ancho}%` }}
                  aria-hidden="true"
                />
                <span className="font-headline-md text-headline-md shrink-0 text-on-surface">
                  {formatEntero(etapa.cantidad)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const claseCelda = "font-body-md text-body-md px-4 py-3 align-top";
const claseEncabezado =
  "font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant";

/**
 * `/catalogo/admin/embudo` — embudo de conversión GLOBAL del sitio
 * (Vistas → Carrito → Órdenes creadas → Órdenes confirmadas).
 *
 * Es global y no por producto porque el evento `ORDEN_CREADA` no lleva
 * `productId`: una orden puede abarcar varios productos, así que un embudo por
 * producto se cortaría justo en el paso final.
 *
 * **Honestidad del dato.** Los emisores de eventos se cablearon en momentos
 * distintos, así que fuera de la ventana confiable las etapas no son
 * comparables entre sí (1 vista contra 72 agregados al carrito daría 7200%).
 * La pantalla nunca muestra un porcentaje mayor a 100%: una tasa no calculable
 * se muestra como "—". Y cuando el período pedido arranca antes de
 * `confiableDesde`, la advertencia va ARRIBA del embudo, no al pie, para que
 * nadie lea los números antes de enterarse de que no son comparables.
 *
 * Mismo patrón visual que `AdminVentas.jsx`: header con eyebrow + título,
 * selector de período, tablas dentro de un contenedor redondeado con
 * `overflow-x-auto` (mobile-first).
 */
function AdminEmbudo() {
  const [dias, setDias] = useState(30);
  const [embudo, setEmbudo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getEmbudoConversion(calcularRango(dias))
      .then((resultado) => {
        if (!activo) return;
        setEmbudo(resultado);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudo cargar el embudo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [dias]);

  function claseBotonPeriodo(activo) {
    return `font-label-md text-label-md min-h-11 rounded-lg px-4 py-2 uppercase tracking-widest transition-colors ${
      activo
        ? "bg-primary text-on-primary"
        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
    }`;
  }

  // "Sin actividad" es no tener ningún evento en ninguna etapa del período.
  const sinDatos =
    embudo !== null && embudo.etapas.every((etapa) => etapa.cantidad === 0);

  const mostrarAdvertencia =
    embudo !== null && !sinDatos && embudo.periodoConfiable === false;

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">
            Embudo
          </h1>
        </div>

        <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
          {PERIODOS.map((periodo) => (
            <button
              key={periodo.dias}
              type="button"
              onClick={() => setDias(periodo.dias)}
              aria-pressed={dias === periodo.dias}
              className={claseBotonPeriodo(dias === periodo.dias)}
            >
              {periodo.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cargando embudo…
          </p>
        </div>
      ) : embudo === null ? null : sinDatos ? (
        <EstadoVacio
          icono="filter_alt"
          titulo="No hubo actividad en este período"
          mensaje="Cuando haya visitas, carritos y órdenes, el embudo de conversión del período va a aparecer acá."
        />
      ) : (
        <>
          {/*
            La advertencia va ANTES del embudo a propósito. Si el período
            pedido arranca antes de que todas las etapas estuvieran
            registrando, los conteos no son comparables entre sí y las tasas
            no significan nada — eso hay que leerlo antes que los números, no
            después.
          */}
          {mostrarAdvertencia ? (
            <div
              data-testid="advertencia-confiabilidad"
              role="status"
              className="mb-8 flex flex-col gap-3 rounded-xl border border-outline bg-tertiary-container p-5"
            >
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-[20px]">
                  warning
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest">
                  Los datos de este período no son comparables
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface">
                {embudo.confiableDesde
                  ? `Cada etapa del embudo empezó a registrarse en un momento distinto, así que en este período hay etapas con menos datos que otras y las tasas de conversión no significan nada. Los datos recién son comparables desde el ${formatFecha(embudo.confiableDesde)}.`
                  : "Todavía hay etapas del embudo que no registraron ningún evento, así que las tasas de conversión no significan nada en ningún período."}
              </p>
              {embudo.confiableDesde ? (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Elegí un período que arranque desde el{" "}
                  {formatFecha(embudo.confiableDesde)} para ver tasas
                  confiables. Las etapas marcadas como “Parcial” son las que
                  están subregistradas en el período elegido.
                </p>
              ) : null}
            </div>
          ) : null}

          <SeccionAdmin
            titulo="Embudo de conversión"
            etiqueta="Embudo de conversión"
          >
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
              <GraficoEmbudo etapas={embudo.etapas} />
            </div>
          </SeccionAdmin>

          <SeccionAdmin titulo="Conversión global" etiqueta="Conversión global">
            <div className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">
                  conversion_path
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest">
                  Conversión global · vistas a órdenes confirmadas
                </span>
              </div>
              <span
                data-testid="tasa-global"
                className="font-headline-md text-headline-md text-on-surface"
              >
                {formatTasa(embudo.tasaGlobal)}
              </span>
              {embudo.tasaGlobalCalculable === false ? (
                <span className="font-body-md text-body-md text-on-surface-variant">
                  No se puede calcular con los datos de este período.
                </span>
              ) : null}
            </div>
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Fuentes de tráfico"
            etiqueta="Fuentes de tráfico"
          >
            {embudo.fuentesTrafico.length === 0 ? (
              <p className="font-body-md text-body-md rounded-xl bg-surface-container-lowest p-5 text-on-surface-variant shadow-ambient">
                Todavía no hay tráfico registrado en el período.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
                <table className="w-full min-w-[320px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className={claseEncabezado}>Origen</th>
                      <th className={claseEncabezado}>Eventos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {embudo.fuentesTrafico.map((fuente) => (
                      <tr
                        key={fuente.fuente}
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td
                          className={`${claseCelda} break-all text-on-surface`}
                        >
                          {fuente.fuente}
                        </td>
                        <td
                          className={`${claseCelda} whitespace-nowrap text-on-surface-variant`}
                        >
                          {formatEntero(fuente.cantidad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SeccionAdmin>
        </>
      )}
    </main>
  );
}

export default AdminEmbudo;
