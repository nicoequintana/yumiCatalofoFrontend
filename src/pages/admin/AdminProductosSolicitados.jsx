import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import { claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";
import { getProductosSolicitados, descargarProductosSolicitados } from "../../api/ordenes.js";
import { formatPrecio } from "../../utils/formato.js";

/**
 * `/catalogo/admin/ordenes/productos-solicitados` — qué productos están
 * pidiendo los clientes, agrupados por producto a través de TODAS las órdenes
 * (sin filtro de fecha) menos las canceladas.
 *
 * Responde una pregunta distinta de la del listado de órdenes: ahí se lee
 * pedido por pedido, acá se lee "cuántas unidades de esto tengo que conseguir
 * en total". Por eso incluye las PENDIENTE, que todavía no descontaron stock
 * pero son demanda real, y deja afuera las canceladas, que no son mercadería a
 * preparar.
 *
 * El Excel sale del MISMO cálculo del backend que alimenta esta tabla
 * (`calcularProductosSolicitados`), no de la data que quedó en el navegador:
 * un archivo que no coincide con la pantalla que lo ofrece es peor que no
 * tener archivo.
 */
function AdminProductosSolicitados() {
  const [productos, setProductos] = useState([]);
  const [historico, setHistorico] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getProductosSolicitados()
      .then((resultado) => {
        if (!activo) return;
        setProductos(resultado.data ?? []);
        setHistorico(resultado.historico ?? null);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        // Se distingue "falló la carga" de "no hay nada": un catch que solo
        // vacía la lista hace que un backend caído se lea como "nadie pidió
        // nada", que es justo la conclusión opuesta a la verdadera.
        setError("Revisá tu conexión e intentá de nuevo.");
        setProductos([]);
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  async function handleDescargar() {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      await descargarProductosSolicitados();
    } catch (err) {
      setErrorDescarga(err.message ?? "No se pudo descargar el Excel.");
    } finally {
      setDescargando(false);
    }
  }

  const hayProductos = productos.length > 0;
  const totalUnidades = productos.reduce((suma, producto) => suma + producto.unidades, 0);

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            to="/catalogo/admin/ordenes"
            className="font-label-md text-label-md mb-2 inline-flex items-center gap-1 uppercase tracking-widest text-secondary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Órdenes
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-primary">Productos solicitados</h1>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            Total pedido por los clientes en todas las órdenes, sin contar las canceladas.
          </p>
        </div>

        {hayProductos ? (
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:opacity-90 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {descargando ? "Descargando…" : "Descargar Excel"}
          </button>
        ) : null}
      </div>

      {errorDescarga ? (
        <p
          role="alert"
          className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container"
        >
          {errorDescarga}
        </p>
      ) : null}

      {historico?.recortado ? (
        <Advertencia titulo="Histórico recortado" testId="aviso-historico">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Se analizaron las {historico.ordenesAnalizadas} órdenes más recientes. Las más viejas
            quedaron afuera, así que las cantidades de abajo son un piso, no el total.
          </p>
        </Advertencia>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cargando productos solicitados…
          </p>
        </div>
      ) : error ? (
        <EstadoVacio
          icono="cloud_off"
          titulo="No se pudieron cargar los productos"
          mensaje={error}
        />
      ) : !hayProductos ? (
        <EstadoVacio
          icono="inventory_2"
          titulo="Todavía no hay productos solicitados"
          mensaje="Cuando entren órdenes, acá vas a ver cuántas unidades de cada producto te están pidiendo."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
            <table
              role="table"
              className={`${claseTablaApilada} w-full min-w-[640px] text-left`}
            >
              <thead role="rowgroup">
                <tr role="row" className="border-b border-outline-variant">
                  <th role="columnheader" className={claseEncabezado}>SKU</th>
                  <th role="columnheader" className={claseEncabezado}>Producto</th>
                  <th role="columnheader" className={claseEncabezado}>Unidades</th>
                  <th role="columnheader" className={claseEncabezado}>Órdenes</th>
                  <th role="columnheader" className={claseEncabezado}>Facturación</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {productos.map((producto) => (
                  <tr
                    key={producto.productId ?? `borrado:${producto.nombre}`}
                    role="row"
                    className="border-b border-outline-variant last:border-b-0"
                  >
                    <td
                      role="cell"
                      data-label="SKU"
                      className="font-body-md text-body-md whitespace-nowrap px-4 py-3 text-on-surface-variant"
                    >
                      {/* Un producto borrado ya no tiene SKU: la línea de la orden
                          sobrevive por su snapshot, el vínculo no. */}
                      {producto.sku ?? "—"}
                    </td>
                    <td
                      role="cell"
                      data-celda="identidad"
                      className="font-body-md text-body-md px-4 py-3 text-on-surface"
                    >
                      {producto.productId ? (
                        <Link
                          to={`/catalogo/admin/productos/${producto.productId}/editar`}
                          className="hover:underline"
                        >
                          {producto.nombre}
                        </Link>
                      ) : (
                        producto.nombre
                      )}
                    </td>
                    <td
                      role="cell"
                      data-label="Unidades"
                      className="font-body-md text-body-md px-4 py-3 font-semibold text-on-surface"
                    >
                      {producto.unidades}
                    </td>
                    <td
                      role="cell"
                      data-label="Órdenes"
                      className="font-body-md text-body-md px-4 py-3 text-on-surface-variant"
                    >
                      {producto.ordenes}
                    </td>
                    <td
                      role="cell"
                      data-label="Facturación"
                      className="font-body-md text-body-md whitespace-nowrap px-4 py-3 text-on-surface-variant"
                    >
                      {formatPrecio(producto.facturacion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-body-md text-body-md mt-6 text-on-surface-variant">
            {productos.length} producto{productos.length === 1 ? "" : "s"} · {totalUnidades} unidad
            {totalUnidades === 1 ? "" : "es"} en total
          </p>
        </>
      )}
    </main>
  );
}

export default AdminProductosSolicitados;
