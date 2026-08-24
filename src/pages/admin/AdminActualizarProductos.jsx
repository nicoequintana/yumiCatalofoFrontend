import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import TablaErroresImportacion from "../../components/admin/TablaErroresImportacion.jsx";
import { actualizarProductosMasivo, exportarProductos } from "../../api/importProductos.js";

/**
 * Arma el mensaje de resultado a partir de `{ creados, actualizados }`: los
 * dos juntos si el lote trajo altas y actualizaciones, o solo el que
 * corresponda cuando el lote fue de un solo tipo — mostrar "se crearon 0"
 * junto a "se actualizaron 7" es ruido que no aporta nada.
 */
function mensajeResultado({ creados, actualizados }) {
  if (creados > 0 && actualizados > 0) {
    return `Se crearon ${creados} productos nuevos y se actualizaron ${actualizados}.`;
  }
  if (creados > 0) {
    return `Se crearon ${creados} productos nuevos.`;
  }
  return `Se actualizaron ${actualizados} productos.`;
}

/**
 * Actualización masiva del catálogo por planilla `.xlsx`, matcheada por SKU
 * — y también alta: una fila con SKU vacío crea un producto nuevo, igual que
 * el alta clásica (oculto, sin media, sku nuevo generado por el backend).
 *
 * Flujo separado del alta masiva (`AdminImportarProductos`), que sigue
 * existiendo tal cual para la carga inicial en frío desde una plantilla en
 * blanco. Acá el punto de partida es el catálogo YA exportado: la planilla
 * no toca fotos, video ni visibilidad de los productos existentes, solo su
 * contenido, precio y stock. Mismos tres estados que el alta: inicial
 * (exportar/subir), procesando, y resultado (éxito o tabla de errores). Es
 * todo o nada: si el backend devuelve errores, no se tocó ningún producto y
 * el archivo queda seleccionado para reintentar después de corregirlo.
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
          Descargá el catálogo completo, editá lo que necesites (precio, stock, etc.) y volvé a
          subirlo — actualiza los productos existentes por SKU sin tocar fotos, video o visibilidad,
          y podés agregar filas nuevas al final para cargar productos.
        </p>
        <ul className="font-body-md text-body-md list-disc pl-5 text-on-surface-variant">
          <li>Cada fila se matchea por SKU: si el SKU no existe, esa fila se rechaza.</li>
          <li>No borres ni cambies la columna SKU — es la que identifica a cada producto.</li>
          <li>
            Dejá la columna SKU vacía en una fila para agregar un producto nuevo — entra oculto y sin
            fotos, igual que el alta.
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
              <Spinner className="h-4 w-4 text-on-surface-variant" />
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
            className="font-body-md text-body-md w-full max-w-2xl rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleActualizar}
            disabled={!archivo || actualizando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
          >
            {actualizando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
            {actualizando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {resultado ? (
        <div className="max-w-2xl rounded-lg bg-secondary-container px-4 py-4">
          <p className="font-body-md text-body-md text-on-secondary-container">
            {mensajeResultado(resultado)}{" "}
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
