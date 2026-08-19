import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getResumenClientes } from "../../api/adminClientes.js";
import { formatPrecio } from "../../utils/formato.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

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

/** Tarjeta de métrica principal. */
function TarjetaMetrica({ icono, etiqueta, valor, detalle, testId }) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-5 shadow-ambient"
    >
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[20px]">{icono}</span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest">
          {etiqueta}
        </span>
      </div>
      <span className="font-headline-md text-headline-md break-words text-on-surface">
        {valor}
      </span>
      {detalle ? (
        <span className="font-body-md text-body-md text-on-surface-variant">
          {detalle}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Barra de composición nuevos/recurrentes, en CSS puro.
 *
 * A propósito sin librería de gráficos, misma línea que `AdminVentas.jsx`: dos
 * proporciones no justifican sumar un bundle entero.
 *
 * Con 0 clientes las dos franjas quedarían en `NaN%`, así que se protege la
 * división y la barra se dibuja vacía.
 */
function BarraComposicion({ nuevos, recurrentes }) {
  const total = nuevos + recurrentes;
  const porcentajeNuevos = total > 0 ? (nuevos / total) * 100 : 0;
  const porcentajeRecurrentes = total > 0 ? (recurrentes / total) * 100 : 0;

  return (
    <div data-testid="desglose-clientes" className="flex flex-col gap-3">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container"
        role="img"
        aria-label={`${nuevos} clientes nuevos y ${recurrentes} recurrentes`}
      >
        <div className="bg-primary" style={{ width: `${porcentajeNuevos}%` }} />
        <div
          className="bg-secondary"
          style={{ width: `${porcentajeRecurrentes}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <span className="font-body-md text-body-md flex items-center gap-2 text-on-surface">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <strong className="font-headline-md text-headline-md">
            {nuevos}
          </strong>
          nuevos
        </span>
        <span className="font-body-md text-body-md flex items-center gap-2 text-on-surface">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-secondary"
            aria-hidden="true"
          />
          <strong className="font-headline-md text-headline-md">
            {recurrentes}
          </strong>
          recurrentes
        </span>
      </div>
    </div>
  );
}

const claseCelda = "font-body-md text-body-md px-4 py-3 align-top";
const claseEncabezado =
  "font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant";

/**
 * `/catalogo/admin/clientes` — dashboard de clientes del panel admin.
 *
 * Un cliente "cuenta" desde que tiene una orden CONFIRMADA en adelante, el
 * mismo umbral que usa el dashboard de ventas (es cuando el backend descuenta
 * stock). Las órdenes PENDIENTE o CANCELADA no convierten a nadie en cliente.
 *
 * **Nuevo vs. recurrente** se decide por el histórico completo, no por el
 * período visible: quien compró dos veces es recurrente aunque solo una de
 * esas compras caiga en la ventana elegida. Si dependiera del zoom del
 * selector, la tasa de recompra cambiaría sola al cambiar de período.
 *
 * **`tiempoEntreCompras` puede ser `null`** y se muestra como "sin datos
 * suficientes", nunca como "0 días". Con los datos actuales (cada cliente con
 * una sola compra) ese es justamente el estado: todavía no hay recompras que
 * medir, y un cero diría lo contrario.
 *
 * Los montos llegan del backend como string (valores `Decimal` de Prisma,
 * serializados como string para no perder precisión) y se muestran con
 * `formatPrecio`, el mismo formateador que usa el resto de la app.
 *
 * Mismo patrón visual que `AdminVentas.jsx`: header con eyebrow + título,
 * tablas dentro de un contenedor redondeado con `overflow-x-auto` (mobile
 * first: la tabla scrollea adentro de su caja en vez de romper el layout).
 */
function AdminClientes() {
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getResumenClientes(calcularRango(dias))
      .then((resultado) => {
        if (!activo) return;
        setResumen(resultado);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudieron cargar los clientes.");
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

  const sinDatos = resumen !== null && resumen.totalClientes === 0;

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
            Clientes
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
            Cargando clientes…
          </p>
        </div>
      ) : resumen === null ? null : sinDatos ? (
        <EstadoVacio
          icono="group"
          titulo="No hubo clientes en este período"
          mensaje="Cuando se confirmen órdenes, los clientes del período van a aparecer acá."
        />
      ) : (
        <>
          <SeccionAdmin
            titulo="Resumen de clientes"
            etiqueta="Resumen de clientes"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TarjetaMetrica
                icono="group"
                etiqueta="Clientes"
                valor={String(resumen.totalClientes)}
                detalle="Con compras confirmadas en el período"
              />
              <TarjetaMetrica
                icono="payments"
                etiqueta="Valor por cliente"
                valor={formatPrecio(resumen.valorPromedioPorCliente)}
                detalle={`${formatPrecio(resumen.ingresosPeriodo)} facturados`}
              />
              <TarjetaMetrica
                icono="repeat"
                etiqueta="Tasa de recompra"
                valor={`${(resumen.tasaRecompra * 100).toFixed(1)}%`}
                detalle={
                  resumen.clientesRecurrentes === 1
                    ? "1 cliente volvió a comprar"
                    : `${resumen.clientesRecurrentes} clientes volvieron a comprar`
                }
              />
              {/*
                Tiempo entre compras: `null` significa que todavía nadie
                repitió, no que vuelvan a comprar el mismo día. Se dice
                explícitamente en vez de mostrar un 0 que sería falso.
              */}
              <TarjetaMetrica
                testId="tiempo-entre-compras"
                icono="schedule"
                etiqueta="Tiempo entre compras"
                valor={
                  resumen.tiempoEntreCompras === null
                    ? "Sin datos suficientes"
                    : `${resumen.tiempoEntreCompras} días`
                }
                detalle={
                  resumen.tiempoEntreCompras === null
                    ? "Todavía ningún cliente compró más de una vez."
                    : "Promedio entre compras consecutivas"
                }
              />
            </div>
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Nuevos y recurrentes"
            etiqueta="Composición de clientes"
          >
            <div className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
              <BarraComposicion
                nuevos={resumen.clientesNuevos}
                recurrentes={resumen.clientesRecurrentes}
              />
              <p className="font-body-md text-body-md text-on-surface-variant">
                Un cliente es recurrente cuando tiene más de una compra
                confirmada, contando toda su historia y no solo el período
                elegido.
              </p>
            </div>
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Mejores clientes"
            etiqueta="Ranking de clientes"
          >
            {resumen.rankingClientes.length === 0 ? (
              <p className="font-body-md text-body-md rounded-xl bg-surface-container-lowest p-5 text-on-surface-variant shadow-ambient">
                Todavía no hay clientes con compras confirmadas.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className={claseEncabezado}>#</th>
                      <th className={claseEncabezado}>Cliente</th>
                      <th className={claseEncabezado}>DNI</th>
                      <th className={claseEncabezado}>Órdenes</th>
                      <th className={claseEncabezado}>Facturación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.rankingClientes.map((cliente, indice) => (
                      <tr
                        key={cliente.dni}
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td className={`${claseCelda} text-on-surface-variant`}>
                          {indice + 1}
                        </td>
                        <td className={`${claseCelda} text-on-surface`}>
                          {cliente.nombre}
                        </td>
                        <td
                          className={`${claseCelda} whitespace-nowrap text-on-surface-variant`}
                        >
                          {cliente.dni}
                        </td>
                        <td className={`${claseCelda} text-on-surface-variant`}>
                          {cliente.cantidadOrdenes}
                        </td>
                        <td
                          className={`${claseCelda} whitespace-nowrap text-on-surface`}
                        >
                          {formatPrecio(cliente.facturacion)}
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

export default AdminClientes;
