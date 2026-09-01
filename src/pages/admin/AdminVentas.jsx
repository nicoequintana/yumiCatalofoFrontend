import { useEffect, useMemo, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getResumenVentas } from "../../api/adminVentas.js";
import { formatPrecio } from "../../utils/formato.js";
import { calcularRango } from "../../utils/periodo.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";
import SelectorPeriodo from "../../components/admin/SelectorPeriodo.jsx";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import AvisoPeriodoRecortado from "../../components/admin/AvisoPeriodoRecortado.jsx";
import TarjetaMetrica from "../../components/admin/TarjetaMetrica.jsx";
import { claseCelda, claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";
import { ETIQUETA_ESTADO, ESTILOS_ESTADO } from "../../constants/ordenes.js";

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
 * cero (período sin ingresos confirmados pero con órdenes en otros estados),
 * se evita la división por cero y quedan todas en altura mínima en vez de
 * romper el SVG con `NaN`.
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
 * Una tarjeta por estado de orden, con su venta y su costo.
 *
 * `CANCELADA` va sin montos por pedido explícito: una cancelada no es plata, y
 * un monto al lado de tres tarjetas que sí lo son invita a sumarla
 * mentalmente. La tasa de cancelación vive adentro de esa misma tarjeta, que
 * es lo que califica.
 *
 * El chip usa `ESTILOS_ESTADO`, el mismo mapa que `BadgeEstado`: un estado
 * tiene que verse igual acá que en el listado de órdenes.
 */
function TarjetaEstado({ estado, cantidadOrdenes, venta, costo, mostrarMontos, detalle }) {
  return (
    <div
      data-testid={`estado-${estado}`}
      className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-ambient"
    >
      <span
        className={`font-label-sm text-label-sm w-fit rounded-full px-3 py-1 uppercase tracking-widest ${ESTILOS_ESTADO[estado]}`}
      >
        {ETIQUETA_ESTADO[estado]}
      </span>

      {mostrarMontos ? (
        <dl className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-body-md text-body-md text-on-surface-variant">Venta</dt>
            <dd className="font-headline-md text-headline-md break-words text-on-surface">
              {formatPrecio(venta)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-body-md text-body-md text-on-surface-variant">Costo</dt>
            <dd className="font-body-lg text-body-lg break-words text-on-surface-variant">
              {formatPrecio(costo)}
            </dd>
          </div>
        </dl>
      ) : null}

      <span className="font-body-md text-body-md text-on-surface-variant">
        {cantidadOrdenes} {cantidadOrdenes === 1 ? "orden" : "órdenes"}
        {detalle ? ` · ${detalle}` : ""}
      </span>
    </div>
  );
}

/**
 * `/catalogo/admin/ventas` — dashboard de facturación del panel admin.
 *
 * "Resumen de facturación" cuenta ingresos solo desde EN_PREPARACION en
 * adelante (EN_PREPARACION, ENTREGADA), porque ese es el momento en que el
 * backend descuenta stock. Las cuatro tarjetas de "Órdenes por estado"
 * muestran los CUATRO estados del flujo con su propia venta y costo — nunca
 * se suman al resumen de arriba, así que lo pendiente no se confunde con
 * ingreso ya facturado. `CANCELADA` es la única sin montos (ver
 * `TarjetaEstado`); en su lugar muestra la tasa de cancelación del período.
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
 * `overflow-x-auto`. Ese scroll cubre de `md` para arriba, hasta que el
 * `min-w` de la tabla entra en el ancho: ahí la tabla scrollea adentro de su
 * caja en vez de romper el layout de la página. Por debajo de `md` la tabla
 * APILA (`claseTablaApilada`, ver `clasesTabla.js`) y no hay nada que
 * desplazar de costado.
 */
function AdminVentas() {
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Contador del botón "Actualizar": incrementarlo re-dispara el efecto de
  // carga sin tocar el período elegido. Mismo patrón que el `reintento` de
  // AdminMetricas — acá el dato cambia por afuera (los pedidos entran solos
  // desde el checkout mientras se mira el dashboard).
  const [refresco, setRefresco] = useState(0);

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
  }, [dias, refresco]);

  // "Sin datos" es no tener NINGUNA orden en ningún estado. Si hay canceladas
  // y nada más, la pantalla tiene algo que decir y no puede contestar "no hubo
  // ventas en este período". Se exige `porEstado` NO VACÍO: con un array
  // vacío o ausente, `.every()` da `true` sobre cero elementos y una
  // respuesta malformada se leería con confianza como "no hubo ventas".
  const filasPorEstado = resumen?.porEstado ?? [];
  const sinDatos =
    resumen !== null &&
    filasPorEstado.length > 0 &&
    filasPorEstado.every((fila) => fila.cantidadOrdenes === 0);

  // Se lee con `?.`: un backend anterior al tope no manda `historico`, y ahí
  // no hay nada que advertir.
  const mostrarAdvertenciaHistorico =
    resumen !== null && !sinDatos && resumen.historico?.recortado === true;

  // La cobertura se mide en PLATA, no en cantidad de líneas: lo que importa es
  // cuánta facturación quedó sin explicar, no cuántos renglones. CANCELADA
  // queda afuera de las dos sumas: el aviso solo puede hablar de plata que la
  // pantalla efectivamente muestra, y la tarjeta de canceladas no muestra
  // montos (ver `TarjetaEstado`) — sumarla nombraría un total que no aparece
  // en ningún lado.
  const cobertura = useMemo(() => {
    const filas = (resumen?.porEstado ?? []).filter((fila) => fila.estado !== "CANCELADA");
    const venta = filas.reduce((suma, fila) => suma + Number(fila.venta), 0);
    const conCosto = filas.reduce((suma, fila) => suma + Number(fila.ventaConCosto), 0);
    return { venta, conCosto, completa: conCosto >= venta };
  }, [resumen]);

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

        <div className="flex items-center gap-3">
          <SelectorPeriodo dias={dias} onCambiar={setDias} />
          <BotonActualizar
            onActualizar={() => setRefresco((n) => n + 1)}
            actualizando={cargando}
          />
        </div>
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
                detalle="En preparación en adelante"
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

          {!cobertura.completa ? (
            <Advertencia
              testId="aviso-cobertura-costo"
              titulo="El costo no cubre todas las ventas"
            >
              <p className="font-body-md text-body-md text-on-surface">
                El costo se calculó sobre {formatPrecio(String(cobertura.conCosto))} de{" "}
                {formatPrecio(String(cobertura.venta))} vendidos. La diferencia son
                ventas sin costo registrado — órdenes anteriores a que existiera el
                costeo, o productos sin costo cargado.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Esas líneas quedan fuera del costo y no se cuentan como costo cero:
                sumarlas en cero haría parecer que esa mercadería no costó nada.
              </p>
            </Advertencia>
          ) : null}

          <SeccionAdmin
            titulo="Órdenes por estado"
            etiqueta="Órdenes por estado"
            descripcion="Cuánto hay parado en cada estado ahora mismo. Los estados no se acumulan: una orden entregada ya no figura en preparación."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {resumen.porEstado.map((fila) => (
                <TarjetaEstado
                  key={fila.estado}
                  estado={fila.estado}
                  cantidadOrdenes={fila.cantidadOrdenes}
                  venta={fila.venta}
                  costo={fila.costo}
                  mostrarMontos={fila.estado !== "CANCELADA"}
                  detalle={
                    fila.estado === "CANCELADA"
                      ? `${(resumen.tasaCancelacion * 100).toFixed(1)}% del período`
                      : null
                  }
                />
              ))}
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
