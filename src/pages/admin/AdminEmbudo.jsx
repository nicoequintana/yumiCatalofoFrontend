import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getEmbudoConversion } from "../../api/adminEmbudo.js";
import { formatFecha } from "../../utils/formato.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";
import SelectorPeriodo from "../../components/admin/SelectorPeriodo.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import AvisoPeriodoRecortado from "../../components/admin/AvisoPeriodoRecortado.jsx";
import { claseCelda, claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";

/** Ancho mínimo de barra, para que una etapa en cero siga siendo visible. */
const ANCHO_MINIMO = 6;

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
 * `overflow-x-auto`. Ese scroll cubre de `md` para arriba, hasta que el
 * `min-w` de la tabla entra en el ancho; por debajo de `md` la tabla APILA
 * (`claseTablaApilada`, ver `clasesTabla.js`) y no hay nada que desplazar de
 * costado.
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

    getEmbudoConversion({ dias })
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

        <SelectorPeriodo dias={dias} onCambiar={setDias} />
      </div>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {/*
        Aviso de recorte del período. Va afuera del ternario de carga —y por
        lo tanto también arriba del estado vacío— porque un "no hubo
        actividad" sobre una ventana que no es la pedida responde otra
        pregunta. Mientras carga, `embudo` es null y no renderiza nada.
      */}
      <AvisoPeriodoRecortado periodo={embudo?.periodo} />

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
            <Advertencia
              testId="advertencia-confiabilidad"
              titulo="Los datos de este período no son comparables"
            >
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
            </Advertencia>
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
                <table
                  role="table"
                  className={`${claseTablaApilada} w-full min-w-[320px] text-left`}
                >
                  <thead role="rowgroup">
                    <tr role="row" className="border-b border-outline-variant">
                      <th role="columnheader" className={claseEncabezado}>Origen</th>
                      <th role="columnheader" className={claseEncabezado}>Eventos</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {embudo.fuentesTrafico.map((fuente) => (
                      <tr
                        key={fuente.fuente}
                        role="row"
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td
                          role="cell"
                          data-celda="identidad"
                          className={`${claseCelda} break-all text-on-surface`}
                        >
                          {fuente.fuente}
                        </td>
                        <td
                          role="cell"
                          data-label="Eventos"
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
