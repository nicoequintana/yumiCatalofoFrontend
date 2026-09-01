import { useEffect, useMemo, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getResumenVentas } from "../../api/adminVentas.js";
import { formatPrecio } from "../../utils/formato.js";
import { calcularRango } from "../../utils/periodo.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";
import SelectorPeriodo from "../../components/admin/SelectorPeriodo.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import AvisoPeriodoRecortado from "../../components/admin/AvisoPeriodoRecortado.jsx";
import TarjetaMetrica from "../../components/admin/TarjetaMetrica.jsx";
import { claseCelda, claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";

/** Miles con separador local, para que "20000" se lea como "20.000". */
const formatCantidad = new Intl.NumberFormat("es-AR").format;

/** "2026-08-10" -> "10/08", etiqueta corta para el eje del gráfico. */
function etiquetaDia(fecha) {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

/**
 * Gráfico de barras de ingresos por día, en SVG inline.
 *
 * A propósito sin librería de gráficos: el proyecto evita dependencias
 * pesadas (misma línea que "sin Redux, sin GraphQL"), y una serie de barras
 * con un solo valor por día no justifica sumar un bundle entero.
 *
 * Las barras se escalan contra el máximo del período. Si todos los días son
 * cero (período sin ventas pero con pipeline), se evita la división por cero
 * y quedan todas en altura mínima en vez de romper el SVG con `NaN`.
 */
function GraficoIngresos({ serie }) {
  const maximo = useMemo(
    () =>
      serie.reduce(
        (mayor, punto) => Math.max(mayor, parseFloat(punto.ingresos) || 0),
        0,
      ),
    [serie],
  );

  if (serie.length === 0) return null;

  const anchoBarra = 100 / serie.length;
  // Solo se etiquetan algunos días: con 90 puntos, todas las etiquetas se
  // pisan y el eje se vuelve ilegible.
  const cadaCuantas = Math.ceil(serie.length / 7);

  return (
    <div className="w-full">
      <svg
        data-testid="grafico-ingresos"
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
        role="img"
        aria-label="Ingresos por día del período"
        className="h-40 w-full"
      >
        {serie.map((punto, indice) => {
          const valor = parseFloat(punto.ingresos) || 0;
          // Altura útil de 36 sobre un viewBox de 42, dejando aire arriba.
          const alto = maximo > 0 ? (valor / maximo) * 36 : 0;
          return (
            <rect
              key={punto.fecha}
              x={indice * anchoBarra + anchoBarra * 0.15}
              y={38 - alto}
              width={anchoBarra * 0.7}
              height={Math.max(alto, 0.4)}
              rx="0.4"
              className={valor > 0 ? "fill-primary" : "fill-outline-variant"}
            >
              <title>{`${etiquetaDia(punto.fecha)}: ${formatPrecio(punto.ingresos)}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="mt-2 flex">
        {serie.map((punto, indice) => (
          <span
            key={punto.fecha}
            style={{ width: `${anchoBarra}%` }}
            className="font-label-sm text-label-sm shrink-0 text-center text-on-surface-variant"
          >
            {indice % cadaCuantas === 0 ? etiquetaDia(punto.fecha) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * `/catalogo/admin/ventas` — dashboard de facturación del panel admin.
 *
 * Una venta cuenta desde CONFIRMADA en adelante (CONFIRMADA, EN_PREPARACION,
 * ENTREGADA), porque ese es el momento en que el backend descuenta stock. Las
 * órdenes PENDIENTE se muestran aparte como *pipeline* (ingreso potencial,
 * todavía no facturado) y nunca se mezclan con los ingresos — de ahí que el
 * pipeline viva en su propio bloque visual y no entre las tarjetas de arriba.
 *
 * **El histórico tiene tope** (`MAX_ORDENES_HISTORICO` en el backend, mismo
 * mecanismo que `AdminClientes.jsx`). Cuando se alcanza, la respuesta llega
 * con `historico.recortado: true` y las órdenes que quedaron afuera son las
 * MÁS VIEJAS, así que los ingresos, las unidades y el ranking del período
 * pasan a ser un piso: la facturación anterior al corte no está sumada. Eso
 * se avisa arriba de todo, antes de los números, y se calla en el estado
 * vacío porque califica métricas que ahí no se muestran.
 *
 * Los montos llegan del backend como string (valores `Decimal` de Prisma,
 * serializados como string para no perder precisión) y se muestran con
 * `formatPrecio`, el mismo formateador que usa el resto de la app.
 *
 * Mismo patrón visual que `AdminLogs.jsx`/`AdminMetricas.jsx`: header con
 * eyebrow + título, tablas dentro de un contenedor redondeado con
 * `overflow-x-auto` (mobile-first: la tabla scrollea adentro de su caja en vez
 * de romper el layout de la página).
 */
function AdminVentas() {
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getResumenVentas(calcularRango(dias))
      .then((resultado) => {
        if (!activo) return;
        setResumen(resultado);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudieron cargar las ventas.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [dias]);

  // "Sin ventas" es no haber facturado NI tener pipeline: si hay órdenes
  // pendientes, hay algo que mostrar aunque los ingresos sean cero.
  const sinDatos =
    resumen !== null &&
    resumen.cantidadOrdenes === 0 &&
    (resumen.pipeline?.cantidadOrdenes ?? 0) === 0;

  // Se lee con `?.`: un backend anterior al tope no manda `historico`, y ahí
  // no hay nada que advertir.
  const mostrarAdvertenciaHistorico =
    resumen !== null && !sinDatos && resumen.historico?.recortado === true;

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
            Ventas
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
        Va afuera del ternario de carga, y por lo tanto también arriba del
        estado vacío: un "no hubo ventas en este período" sobre una ventana
        que no es la pedida está respondiendo otra pregunta, y ahí callar el
        recorte confunde más que en la pantalla con datos. Mientras carga,
        `resumen` es null y el aviso no renderiza nada.
      */}
      <AvisoPeriodoRecortado periodo={resumen?.periodo} />

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cargando ventas…
          </p>
        </div>
      ) : resumen === null ? null : sinDatos ? (
        <EstadoVacio
          icono="payments"
          titulo="No hubo ventas en este período"
          mensaje="Cuando se confirmen órdenes, la facturación del período va a aparecer acá."
        />
      ) : (
        <>
          {/*
            La advertencia va ANTES de las métricas, igual que en
            `AdminClientes.jsx`: si el histórico se recortó, los números de
            abajo son un piso y eso hay que leerlo antes que los números, no
            después.
          */}
          {mostrarAdvertenciaHistorico ? (
            <Advertencia
              testId="advertencia-historico"
              titulo="Estos números son un mínimo, no el total"
            >
              <p className="font-body-md text-body-md text-on-surface">
                Se analizaron las{" "}
                {formatCantidad(resumen.historico.ordenesAnalizadas)} órdenes
                más recientes, que es el tope de{" "}
                {formatCantidad(resumen.historico.tope)} que se trae del
                histórico. Las órdenes anteriores a ese corte quedaron afuera.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Por eso los ingresos, las unidades vendidas y el ranking de
                productos son un piso, no el total real: la facturación
                anterior al corte no está sumada.
              </p>
            </Advertencia>
          ) : null}

          <SeccionAdmin
            titulo="Resumen de facturación"
            etiqueta="Resumen de facturación"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TarjetaMetrica
                icono="payments"
                etiqueta="Ingresos"
                valor={formatPrecio(resumen.ingresosTotales)}
                detalle="Órdenes confirmadas en adelante"
              />
              <TarjetaMetrica
                icono="receipt_long"
                etiqueta="Órdenes"
                valor={String(resumen.cantidadOrdenes)}
                detalle={`${resumen.productosPorOrden} productos por orden`}
              />
              <TarjetaMetrica
                icono="local_atm"
                etiqueta="Ticket promedio"
                valor={formatPrecio(resumen.ticketPromedio)}
              />
              <TarjetaMetrica
                icono="inventory_2"
                etiqueta="Unidades vendidas"
                valor={String(resumen.unidadesVendidas)}
              />
            </div>
          </SeccionAdmin>

          {/*
            Pipeline y cancelaciones: bloque visualmente separado de las
            tarjetas de ingresos, con su propio fondo, para que el valor
            pendiente no se lea nunca como plata ya facturada.
          */}
          <SeccionAdmin
            titulo="Pipeline y cancelaciones"
            etiqueta="Pipeline y cancelaciones"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                data-testid="pipeline"
                className="flex flex-col gap-2 rounded-xl border border-dashed border-outline bg-surface-container p-5"
              >
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">
                    hourglass_top
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest">
                    Pipeline · pendiente de confirmar
                  </span>
                </div>
                <span className="font-headline-md text-headline-md break-words text-on-surface-variant">
                  {formatPrecio(resumen.pipeline.valorTotal)}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {resumen.pipeline.cantidadOrdenes}{" "}
                  {resumen.pipeline.cantidadOrdenes === 1
                    ? "orden pendiente"
                    : "órdenes pendientes"}{" "}
                  — todavía no cuenta como ingreso.
                </span>
              </div>

              <div className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">
                    cancel
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest">
                    Tasa de cancelación
                  </span>
                </div>
                <span className="font-headline-md text-headline-md text-on-surface">
                  {`${(resumen.tasaCancelacion * 100).toFixed(1)}%`}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {resumen.ordenesCanceladas}{" "}
                  {resumen.ordenesCanceladas === 1
                    ? "orden cancelada"
                    : "órdenes canceladas"}{" "}
                  en el período.
                </span>
              </div>
            </div>
          </SeccionAdmin>

          <SeccionAdmin titulo="Ingresos por día" etiqueta="Ingresos por día">
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
              <GraficoIngresos serie={resumen.serieTemporal} />
            </div>
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Productos por facturación"
            etiqueta="Ranking de productos"
          >
            {resumen.rankingProductos.length === 0 ? (
              <p className="font-body-md text-body-md rounded-xl bg-surface-container-lowest p-5 text-on-surface-variant shadow-ambient">
                Todavía no hay productos facturados en el período.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
                <table
                  role="table"
                  className={`${claseTablaApilada} w-full min-w-[520px] text-left`}
                >
                  <thead role="rowgroup">
                    <tr role="row" className="border-b border-outline-variant">
                      <th role="columnheader" className={claseEncabezado}>#</th>
                      <th role="columnheader" className={claseEncabezado}>Producto</th>
                      <th role="columnheader" className={claseEncabezado}>Unidades</th>
                      <th role="columnheader" className={claseEncabezado}>Facturación</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {resumen.rankingProductos.map((producto, indice) => (
                      <tr
                        key={producto.productId}
                        role="row"
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td
                          role="cell"
                          data-celda="control"
                          className={`${claseCelda} text-on-surface-variant`}
                        >
                          {indice + 1}
                        </td>
                        <td
                          role="cell"
                          data-celda="identidad"
                          className={`${claseCelda} text-on-surface`}
                        >
                          {producto.nombre}
                        </td>
                        <td
                          role="cell"
                          data-label="Unidades"
                          className={`${claseCelda} text-on-surface-variant`}
                        >
                          {producto.unidades}
                        </td>
                        <td
                          role="cell"
                          data-label="Facturación"
                          className={`${claseCelda} whitespace-nowrap text-on-surface`}
                        >
                          {formatPrecio(producto.facturacion)}
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

export default AdminVentas;
