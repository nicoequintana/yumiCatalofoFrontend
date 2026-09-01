import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getResumenClientes } from "../../api/adminClientes.js";
import { formatPrecio } from "../../utils/formato.js";
import { calcularRango } from "../../utils/periodo.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";
import SelectorPeriodo from "../../components/admin/SelectorPeriodo.jsx";
import TarjetaMetrica from "../../components/admin/TarjetaMetrica.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import AvisoPeriodoRecortado from "../../components/admin/AvisoPeriodoRecortado.jsx";
import { claseCelda, claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";

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

/** Miles con separador local, para que "20000" se lea como "20.000". */
const formatCantidad = new Intl.NumberFormat("es-AR").format;

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
 * **El histórico tiene tope** (`MAX_ORDENES_HISTORICO` en el backend). Cuando
 * se alcanza, la respuesta llega con `historico.recortado: true` y las órdenes
 * que quedaron afuera son las MÁS VIEJAS, así que clientes recurrentes,
 * ranking y tiempo entre compras pasan a ser un piso: alguien cuya única
 * compra anterior cayó fuera del corte se lee como "nuevo". Eso se avisa
 * arriba de todo, antes de los números, con el mismo criterio que la
 * advertencia de confiabilidad de `AdminEmbudo.jsx`.
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

  const sinDatos = resumen !== null && resumen.totalClientes === 0;

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
            Clientes
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
        El aviso de recorte del período va afuera del ternario de carga, así
        aparece también sobre el estado vacío: un "no hubo clientes" sobre una
        ventana que no es la pedida responde otra pregunta. Es distinto del
        aviso de histórico de más abajo, que sí se calla en el estado vacío
        porque califica métricas que ahí no se muestran. Mientras carga,
        `resumen` es null y no renderiza nada.
      */}
      <AvisoPeriodoRecortado periodo={resumen?.periodo} />

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
          {/*
            La advertencia va ANTES de las métricas, igual que en
            `AdminEmbudo.jsx`: si el histórico se recortó, los números de abajo
            son un piso y eso hay que leerlo antes que los números, no después.
          */}
          {mostrarAdvertenciaHistorico ? (
            <Advertencia
              testId="advertencia-historico"
              titulo="Estos números son un mínimo, no el total"
            >
              <p className="font-body-md text-body-md text-on-surface">
                Se analizaron las{" "}
                {formatCantidad(resumen.historico.ordenesAnalizadas)} órdenes
                confirmadas más recientes, que es el tope de{" "}
                {formatCantidad(resumen.historico.tope)} que se trae del
                histórico. Las compras anteriores a ese corte quedaron afuera.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Por eso los clientes recurrentes, el ranking y el tiempo entre
                compras son un mínimo: quien solo compró antes del corte figura
                acá como cliente nuevo y su facturación de por vida queda
                subestimada.
              </p>
            </Advertencia>
          ) : null}

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
                <table
                  role="table"
                  className={`${claseTablaApilada} w-full min-w-[520px] text-left`}
                >
                  <thead role="rowgroup">
                    <tr role="row" className="border-b border-outline-variant">
                      <th role="columnheader" className={claseEncabezado}>#</th>
                      <th role="columnheader" className={claseEncabezado}>Cliente</th>
                      <th role="columnheader" className={claseEncabezado}>DNI</th>
                      <th role="columnheader" className={claseEncabezado}>Órdenes</th>
                      <th role="columnheader" className={claseEncabezado}>Facturación</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {resumen.rankingClientes.map((cliente, indice) => (
                      <tr
                        key={cliente.dni}
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
                          {cliente.nombre}
                        </td>
                        <td
                          role="cell"
                          data-label="DNI"
                          className={`${claseCelda} whitespace-nowrap text-on-surface-variant`}
                        >
                          {cliente.dni}
                        </td>
                        <td
                          role="cell"
                          data-label="Órdenes"
                          className={`${claseCelda} text-on-surface-variant`}
                        >
                          {cliente.cantidadOrdenes}
                        </td>
                        <td
                          role="cell"
                          data-label="Facturación"
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
