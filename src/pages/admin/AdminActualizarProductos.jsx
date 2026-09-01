import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import TablaErroresImportacion from "../../components/admin/TablaErroresImportacion.jsx";
import { actualizarProductosMasivo, exportarProductos } from "../../api/importProductos.js";

/**
 * Actualización masiva del catálogo por planilla `.xlsx`, matcheada por SKU.
 *
 * La planilla tiene CINCO columnas — `sku`, `nombre`, `costo`, `coeficiente`,
 * `stock` — y eso es literalmente todo lo que la subida puede modificar.
 * Descripción, categoría, etiqueta, contenido comercial, fotos, video y
 * visibilidad quedan intactos porque no viajan en el archivo.
 *
 * **La columna `precio` se fue el 31/08/2026**, cuando el precio de venta pasó a
 * derivarse de `costo × coeficiente`. Consecuencia directa: **esta pantalla ya
 * no publica precios.** Sube costos, y los productos quedan en `Difiere` hasta
 * que alguien aplique desde Costos y precios — con su tabla antes→después de por
 * medio, que es justamente la revisión que un cambio masivo más necesita.
 *
 * **Este flujo no crea productos.** Hasta el 25/08/2026 una fila con SKU vacío
 * daba de alta un producto; dejó de poder hacerlo cuando la planilla se
 * recortó, porque la descripción es obligatoria y ya no viene en el archivo.
 * Las altas van por `AdminImportarProductos` (`/catalogo/admin/productos/importar`),
 * que usa la plantilla completa y sigue igual.
 *
 * Tres estados, mismos que el alta: inicial (exportar/subir), procesando, y
 * resultado (éxito o tabla de errores). Es todo o nada: si el backend devuelve
 * errores, no se tocó ningún producto y el archivo queda seleccionado para
 * reintentar después de corregirlo.
 */
function AdminActualizarProductos() {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState([]);

  async function handleExportar() {
    setError(null);
    setExportando(true);
    try {
      await exportarProductos();
    } catch (err) {
      setError(err.message ?? "No se pudo exportar el catálogo.");
    } finally {
      setExportando(false);
    }
  }

  async function handleActualizar() {
    if (!archivo) return;

    setError(null);
    setErrores([]);
    setResultado(null);
    setActualizando(true);

    try {
      const respuesta = await actualizarProductosMasivo(archivo);
      setResultado(respuesta);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar el catálogo.");
      setErrores(err.errores ?? []);
    } finally {
      setActualizando(false);
    }
  }

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
        Panel de administración
      </span>
      <h1 className="font-headline-lg text-headline-lg mb-6 text-primary">Actualizar productos</h1>

      <div className="mb-8 max-w-2xl rounded-lg bg-surface-container px-4 py-4">
        <p className="font-body-md text-body-md mb-2 text-on-surface">
          Descargá el catálogo, editá lo que necesites y volvé a subirlo. La planilla trae cinco
          columnas: <strong>SKU</strong>, <strong>nombre</strong>, <strong>costo</strong>,{" "}
          <strong>coeficiente</strong> y <strong>stock</strong>.
        </p>
        <ul className="font-body-md text-body-md list-disc pl-5 text-on-surface-variant">
          <li>
            Solo se modifican nombre, costo, coeficiente y stock. La descripción, la categoría, las
            fotos y el resto del contenido quedan como están.
          </li>
          <li>
            <strong>El precio de venta no se sube por acá</strong>: se calcula como costo ×
            coeficiente. Después de subir la planilla, los productos quedan en «Difiere» hasta que
            apliques los precios desde Costos y precios.
          </li>
          <li>
            El coeficiente multiplica al costo (2,05 = ×2,05). Si dejás la celda vacía, se usa 1 y
            el precio queda igual al costo.
          </li>
          <li>No borres ni cambies la columna SKU — es la que identifica a cada producto.</li>
          <li>
            Cada fila necesita un SKU que ya exista. Una fila sin SKU, o con uno que no está en el
            catálogo, se rechaza.
          </li>
          <li>
            Para cargar productos nuevos usá{" "}
            <Link to="/catalogo/admin/productos/importar" className="underline hover:text-primary">
              Importar productos
            </Link>
            , que pide todos los campos.
          </li>
          <li>Si alguna fila tiene errores, no se guarda ninguna. Se corrige y se vuelve a subir.</li>
        </ul>
      </div>

      <div className="mb-8 flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={handleExportar}
            disabled={exportando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-60"
          >
            {exportando ? (
              <Spinner className="h-4 w-4 text-on-surface-variant" decorativo />
            ) : (
              <span className="material-symbols-outlined text-[18px]">download</span>
            )}
            Exportar catálogo
          </button>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            Trae todos los productos, incluidos los ocultos y agotados.
          </p>
        </div>

        <div>
          <label
            htmlFor="archivo"
            className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
          >
            Archivo editado (.xlsx)
          </label>
          <input
            id="archivo"
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="font-body-md text-body-md w-full min-w-0 max-w-2xl rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleActualizar}
            disabled={!archivo || actualizando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
          >
            {actualizando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
            {actualizando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {resultado ? (
        <div className="max-w-2xl rounded-lg bg-secondary-container px-4 py-4">
          <p className="font-body-md text-body-md text-on-secondary-container">
            {`Se ${resultado.actualizados === 1 ? "actualizó" : "actualizaron"} ${resultado.actualizados} ${resultado.actualizados === 1 ? "producto" : "productos"}.`}{" "}
            <Link to="/catalogo/admin/productos" className="underline">
              Ver productos
            </Link>
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="max-w-4xl">
          <p className="font-body-md text-body-md mb-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
            {error}
          </p>

          <TablaErroresImportacion errores={errores} />
        </div>
      ) : null}
    </main>
  );
}

export default AdminActualizarProductos;
