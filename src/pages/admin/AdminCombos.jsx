import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminCombos, eliminarCombo } from "../../api/combos.js";
import { formatPrecio } from "../../utils/formato.js";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import ProductosDeCombo from "../../components/ProductosDeCombo.jsx";
import { MENSAJE_ERROR_CARGA } from "../../hooks/useOfertas.js";
import { claseCelda, claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";

/** Mismas clases que los botones de fila de `AdminPromociones.jsx` (44px de área táctil). */
const claseCtaPrimario =
  "font-label-lg text-label-lg inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60";
const claseBotonFila =
  "font-label-sm text-label-sm inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 uppercase tracking-widest disabled:opacity-60";
const claseBotonFilaContorno = `${claseBotonFila} border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container`;

/** El botón-ícono (44px de área táctil) de Editar/Ver en la tienda. */
const claseBotonFilaIcono =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container";

/**
 * La etiqueta de Estado sale ENTERA de los flags que ya resolvió el backend
 * (`activo`, `vigencia`, `vigente`, `campania`) — esta pantalla no evalúa
 * fechas ni estados de campaña, solo elige el texto y el color.
 */
function estadoDeCombo(combo) {
  if (!combo.activo) return { texto: "Apagado", clase: "bg-surface-container-high text-on-surface-variant" };
  if (combo.vigencia === "SIEMPRE") return { texto: "Activo", clase: "bg-secondary-container text-on-secondary-container" };
  if (combo.vigente) return { texto: "En fecha", clase: "bg-secondary-container text-on-secondary-container" };
  if (!combo.campania) return { texto: "Sin campaña", clase: "bg-error-container text-on-error-container" };
  return { texto: "Fuera de fecha", clase: "bg-surface-container-high text-on-surface-variant" };
}

/** La etiqueta de Vigencia: "Siempre vigente" o "Programado desde campañas · <nombre>". */
function textoVigencia(combo) {
  if (combo.vigencia === "SIEMPRE") return "Siempre vigente";
  return `Programado desde campañas${combo.campania ? ` · ${combo.campania.nombre}` : ""}`;
}

/**
 * Mini ficha de un producto del combo (spec §8.2, "Productos (mini fichas)"):
 * su primera foto, o un ícono cuando el producto no tiene ninguna cargada —
 * mismo criterio de placeholder que `AdminOrdenDetalle.jsx`.
 */
function MiniFichaProducto({ item }) {
  return (
    <span
      data-testid={`mini-foto-${item.productId}`}
      title={item.nombre}
      className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-lg bg-surface-container"
    >
      {item.foto ? (
        <img src={item.foto} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-on-surface-variant">
          inventory_2
        </span>
      )}
    </span>
  );
}

/** `/catalogo/admin/combos` — listado del panel, spec §8.2. */
function AdminCombos() {
  const [combos, setCombos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  function cargar() {
    return getAdminCombos()
      .then((datos) => {
        setCombos(datos);
        setErrorCarga(null);
      })
      .catch(() => setErrorCarga(MENSAJE_ERROR_CARGA));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function eliminar(id) {
    setEliminando(true);
    setErrorAccion(null);
    try {
      await eliminarCombo(id);
      setConfirmandoBorrado(null);
      await cargar();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Combos</h1>
          <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
            Sets de productos con un descuento que se aplica solo si se compran juntos.
          </p>
        </div>
        <Link to="/catalogo/admin/combos/nuevo" className={claseCtaPrimario}>
          <span aria-hidden="true" className="material-symbols-outlined mr-1 text-[18px]">
            add
          </span>
          Nuevo combo
        </Link>
      </div>

      {errorAccion ? (
        <p role="alert" className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {errorAccion}
        </p>
      ) : null}

      {errorCarga ? (
        <EstadoVacio icono="cloud_off" titulo="No se pudieron cargar los combos" mensaje={errorCarga} />
      ) : combos === null ? null : combos.length === 0 ? (
        <EstadoVacio icono="redeem" titulo="Todavía no hay combos" mensaje="Creá el primero desde “Nuevo combo”." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-ambient">
          <table role="table" className={`${claseTablaApilada} w-full min-w-[760px] text-left`}>
            <thead role="rowgroup">
              <tr role="row" className="border-b border-outline-variant bg-surface-container-low">
                <th role="columnheader" className={claseEncabezado}>Combo</th>
                <th role="columnheader" className={claseEncabezado}>Productos</th>
                <th role="columnheader" className={claseEncabezado}>Precio</th>
                <th role="columnheader" className={claseEncabezado}>Vigencia</th>
                <th role="columnheader" className={claseEncabezado}>Estado</th>
                <th role="columnheader" className={claseEncabezado}>Stock</th>
                <th role="columnheader" className={claseEncabezado}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {combos.map((combo) => {
                const estado = estadoDeCombo(combo);
                return (
                  <tr key={combo.id} role="row" className="border-b border-outline-variant last:border-b-0">
                    <td role="cell" data-celda="identidad" className={claseCelda}>
                      <span className="block font-bold text-primary">{combo.nombre}</span>
                      <span className="block text-[13px] text-on-surface-variant">{combo.unidades} productos</span>
                    </td>
                    <td role="cell" data-label="Productos" className={`${claseCelda} text-on-surface-variant`}>
                      <div className="mb-1.5 flex flex-wrap gap-1.5">
                        {combo.items.map((item) => (
                          <MiniFichaProducto key={item.productId} item={item} />
                        ))}
                      </div>
                      <ProductosDeCombo
                        productos={combo.items.map((item) => ({ nombreProducto: item.nombre, cantidad: item.cantidad }))}
                        className="text-[13px]"
                      />
                    </td>
                    <td role="cell" data-label="Precio" className={`${claseCelda} whitespace-nowrap`}>
                      <s className="block text-[13px] text-on-surface-variant">{formatPrecio(combo.precioSeparado)}</s>
                      <strong className="text-on-surface">{formatPrecio(combo.precioCombo)}</strong>{" "}
                      <span className="text-secondary">-{combo.porcentaje}%</span>
                    </td>
                    <td role="cell" data-label="Vigencia" className={`${claseCelda} text-on-surface-variant`}>
                      {textoVigencia(combo)}
                    </td>
                    <td role="cell" data-label="Estado" className={claseCelda}>
                      <span className={`rounded-full px-2 py-1 text-[12px] font-bold ${estado.clase}`}>{estado.texto}</span>
                    </td>
                    <td role="cell" data-label="Stock" className={`${claseCelda} whitespace-nowrap`}>
                      {combo.alcanza > 0 ? `${combo.alcanza} ${combo.alcanza === 1 ? "combo" : "combos"}` : <span className="font-bold text-error">Agotado</span>}
                    </td>
                    <td role="cell" data-celda="acciones" className={`${claseCelda} text-right`}>
                      {confirmandoBorrado === combo.id ? (
                        <span className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={eliminando}
                            onClick={() => eliminar(combo.id)}
                            className={`${claseBotonFila} bg-error text-on-error`}
                          >
                            Sí, eliminar
                          </button>
                          <button type="button" onClick={() => setConfirmandoBorrado(null)} className={claseBotonFilaContorno}>
                            No
                          </button>
                        </span>
                      ) : (
                        <span className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            to={`/catalogo/admin/combos/${combo.id}`}
                            aria-label={`Editar ${combo.nombre}`}
                            className={claseBotonFilaIcono}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                              edit
                            </span>
                          </Link>
                          {combo.vigente ? (
                            <a
                              href={combo.ruta}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Ver ${combo.nombre} en la tienda`}
                              className={claseBotonFilaIcono}
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                                open_in_new
                              </span>
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setConfirmandoBorrado(combo.id)}
                            className={claseBotonFilaContorno}
                          >
                            Eliminar
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default AdminCombos;
