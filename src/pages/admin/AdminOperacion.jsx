import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getResumenOperacion } from "../../api/adminOperacion.js";
import { formatPrecio } from "../../utils/formato.js";
import { calcularRango } from "../../utils/periodo.js";
import SeccionAdmin from "../../components/SeccionAdmin.jsx";
import SelectorPeriodo from "../../components/admin/SelectorPeriodo.jsx";
import BadgeEstado from "../../components/admin/BadgeEstado.jsx";
import { claseCelda, claseEncabezado } from "../../components/admin/clasesTabla.js";
import {
  ESTADOS_ORDEN,
  ESTADOS_NO_TERMINALES,
  ETIQUETA_ESTADO,
} from "../../constants/ordenes.js";

/** "12" -> "12 días" / "1" -> "1 día". */
function textoDias(dias) {
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}

/** Tarjeta compacta de conteo por estado. */
function TarjetaEstado({ etiqueta, cantidad, destacada }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl p-4 ${
        destacada
          ? "bg-primary-container text-on-primary-container"
          : "bg-surface-container-lowest text-on-surface shadow-ambient"
      }`}
    >
      <span className="font-label-sm text-label-sm uppercase tracking-widest opacity-80">
        {etiqueta}
      </span>
      <span className="font-headline-md text-headline-md">{cantidad}</span>
    </div>
  );
}

/**
 * `/catalogo/admin/operacion` — tablero operativo del panel admin.
 *
 * A diferencia de `AdminVentas.jsx` (que mide resultado), esta pantalla mide
 * **trabajo pendiente**. Por eso la tabla de órdenes estancadas va primero y
 * con el mayor peso visual: es la única sección accionable de verdad — cada
 * fila linkea al detalle de la orden para poder destrabarla en el momento.
 *
 * **Sobre el dato de tiempo**: el modelo `Orden` solo tiene `createdAt` y
 * `updatedAt`, sin historial por estado, así que lo único que se puede derivar
 * es el tiempo desde el ÚLTIMO cambio de cualquier tipo — no el tiempo que la
 * orden lleva en el estado en el que está. Toda la copy de la pantalla dice
 * "sin cambios" y nunca "tiempo en este estado", que sería una precisión que
 * el dato no tiene.
 *
 * Mismo patrón visual que `AdminVentas.jsx`: header con eyebrow + título,
 * selector de período, y tablas dentro de un contenedor redondeado con
 * `overflow-x-auto` (mobile-first: la tabla scrollea adentro de su caja en vez
 * de romper el layout de la página).
 */
function AdminOperacion() {
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getResumenOperacion(calcularRango(dias))
      .then((resultado) => {
        if (!activo) return;
        setResumen(resultado);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudo cargar la operación.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [dias]);

  // "Todo al día" es no tener nada que destrabar NI nada que reponer. El
  // conteo por estado se sigue mostrando igual: sigue siendo información útil.
  const todoAlDia =
    resumen !== null &&
    (resumen.ordenesEstancadas?.total ?? 0) === 0 &&
    (resumen.quiebresConDemanda?.length ?? 0) === 0 &&
    (resumen.stockBajo?.length ?? 0) === 0;

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
            Operación
          </h1>
        </div>

        <SelectorPeriodo dias={dias} onCambiar={setDias} />
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
            Cargando operación…
          </p>
        </div>
      ) : resumen === null ? null : (
        <>
          <SeccionAdmin
            titulo="Órdenes por estado"
            etiqueta="Órdenes por estado"
            descripcion="Órdenes creadas en el período seleccionado."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {ESTADOS_ORDEN.map((estado) => (
                <TarjetaEstado
                  key={estado}
                  etiqueta={ETIQUETA_ESTADO[estado]}
                  cantidad={resumen.ordenesPorEstado?.[estado] ?? 0}
                  // Los no terminales son los que todavía requieren trabajo.
                  destacada={ESTADOS_NO_TERMINALES.includes(estado)}
                />
              ))}
            </div>
          </SeccionAdmin>

          {/*
            Sección principal de la pantalla: lo que hay para destrabar. Va
            antes que cualquier otra tabla porque es la única accionable.
          */}
          <SeccionAdmin
            titulo="Órdenes estancadas"
            etiqueta="Órdenes estancadas"
            descripcion={
              <>
                Órdenes sin entregar ni cancelar que no registran cambios desde
                hace más de {textoDias(resumen.umbralEstancamientoDias ?? 3)}.
                El sistema guarda solo la fecha del último cambio, así que esto
                mide el tiempo transcurrido sin cambios, no el tiempo que la
                orden lleva en su estado actual.
              </>
            }
          >
            {resumen.ordenesEstancadas?.lista?.length ? (
              <>
                <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className={claseEncabezado}>Orden</th>
                        <th className={claseEncabezado}>Cliente</th>
                        <th className={claseEncabezado}>Estado</th>
                        <th className={claseEncabezado}>Sin cambios</th>
                        <th className={claseEncabezado}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.ordenesEstancadas.lista.map((orden) => (
                        <tr
                          key={orden.id}
                          className="border-b border-outline-variant last:border-b-0"
                        >
                          <td className={claseCelda}>
                            <Link
                              to={`/catalogo/admin/ordenes/${orden.id}`}
                              className="font-semibold text-primary underline-offset-4 hover:underline"
                            >
                              #{orden.id}
                            </Link>
                          </td>
                          <td className={`${claseCelda} text-on-surface`}>
                            {orden.clienteNombre}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <BadgeEstado estado={orden.estado} />
                          </td>
                          <td
                            className={`${claseCelda} whitespace-nowrap text-on-surface`}
                          >
                            {textoDias(orden.diasSinCambios)}
                          </td>
                          <td
                            className={`${claseCelda} whitespace-nowrap text-on-surface`}
                          >
                            {formatPrecio(orden.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {resumen.ordenesEstancadas.total >
                resumen.ordenesEstancadas.lista.length ? (
                  <p className="font-body-md text-body-md mt-3 text-on-surface-variant">
                    Se muestran {resumen.ordenesEstancadas.lista.length} de{" "}
                    {resumen.ordenesEstancadas.total} órdenes estancadas.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="font-body-md text-body-md rounded-xl bg-surface-container-lowest p-5 text-on-surface-variant shadow-ambient">
                Ninguna orden lleva más de{" "}
                {textoDias(resumen.umbralEstancamientoDias ?? 3)} sin
                movimiento.
              </p>
            )}
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Antigüedad promedio sin cambios"
            etiqueta="Antigüedad sin cambios"
            descripcion="Promedio de días desde el último cambio registrado en cada orden abierta. No es el tiempo que llevan en su estado actual: las órdenes no guardan el historial de cuándo pasaron de un estado a otro."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {ESTADOS_NO_TERMINALES.map((estado) => (
                <div
                  key={estado}
                  className="flex flex-col gap-1 rounded-xl bg-surface-container-lowest p-5 shadow-ambient"
                >
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                    {ETIQUETA_ESTADO[estado]}
                  </span>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {textoDias(resumen.antiguedadPromedio?.[estado] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Quiebres de stock con demanda"
            etiqueta="Quiebres de stock con demanda"
            descripcion="Productos sin stock que igual recibieron visitas en el período: demanda que no se pudo aprovechar."
          >
            {resumen.quiebresConDemanda?.length ? (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className={claseEncabezado}>Producto</th>
                      <th className={claseEncabezado}>Vistas</th>
                      <th className={claseEncabezado}>Stock</th>
                      <th className={claseEncabezado}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.quiebresConDemanda.map((producto) => (
                      <tr
                        key={producto.productId}
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td className={`${claseCelda} text-on-surface`}>
                          {producto.nombre}
                        </td>
                        <td className={`${claseCelda} text-on-surface`}>
                          {producto.vistas}
                        </td>
                        <td className={`${claseCelda} text-on-surface-variant`}>
                          {producto.stock}
                        </td>
                        <td className={claseCelda}>
                          <Link
                            to={`/catalogo/admin/productos/${producto.productId}/editar`}
                            className="font-label-md text-label-md uppercase tracking-widest text-primary underline-offset-4 hover:underline"
                          >
                            Reponer
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-body-md text-body-md rounded-xl bg-surface-container-lowest p-5 text-on-surface-variant shadow-ambient">
                Ningún producto agotado recibió visitas en el período.
              </p>
            )}
          </SeccionAdmin>

          <SeccionAdmin
            titulo="Stock bajo"
            etiqueta="Stock bajo"
            descripcion={`Productos con ${resumen.stockBajoMaximo ?? 3} unidades o menos — los mismos que el catálogo muestra con el aviso de últimas unidades.`}
          >
            {resumen.stockBajo?.length ? (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className={claseEncabezado}>Producto</th>
                      <th className={claseEncabezado}>Stock</th>
                      <th className={claseEncabezado}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.stockBajo.map((producto) => (
                      <tr
                        key={producto.productId}
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <td className={`${claseCelda} text-on-surface`}>
                          {producto.nombre}
                        </td>
                        <td className={`${claseCelda} text-on-surface`}>
                          {producto.stock}
                        </td>
                        <td className={claseCelda}>
                          <Link
                            to={`/catalogo/admin/productos/${producto.productId}/editar`}
                            className="font-label-md text-label-md uppercase tracking-widest text-primary underline-offset-4 hover:underline"
                          >
                            Reponer
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-body-md text-body-md rounded-xl bg-surface-container-lowest p-5 text-on-surface-variant shadow-ambient">
                Ningún producto está por agotarse.
              </p>
            )}
          </SeccionAdmin>

          {/*
            Estado "todo al día": no reemplaza al conteo por estado (que sigue
            arriba), lo confirma. Va al final para que la pantalla cierre con
            una conclusión en vez de con dos tablas vacías.
          */}
          {todoAlDia ? (
            <EstadoVacio
              icono="task_alt"
              titulo="La operación está al día"
              mensaje="No hay órdenes frenadas ni faltantes de stock para atender en este momento."
            />
          ) : null}
        </>
      )}
    </main>
  );
}

export default AdminOperacion;
