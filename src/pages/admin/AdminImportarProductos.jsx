import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import { descargarPlantilla, importarProductos } from "../../api/importProductos.js";

/**
 * Importación masiva de productos desde `.xlsx`.
 *
 * Tres estados: inicial (descargar/subir), procesando, y resultado (éxito o
 * tabla de errores). El import es todo o nada — si el backend devuelve
 * errores, no se creó ningún producto y el archivo queda seleccionado para
 * reintentar después de corregirlo.
 */
function AdminImportarProductos() {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState([]);

  async function handleDescargar() {
    setError(null);
    setDescargando(true);
    try {
      await descargarPlantilla();
    } catch (err) {
      setError(err.message ?? "No se pudo descargar la plantilla.");
    } finally {
      setDescargando(false);
    }
  }

  async function handleImportar() {
    if (!archivo) return;

    setError(null);
    setErrores([]);
    setResultado(null);
    setImportando(true);

    try {
      const respuesta = await importarProductos(archivo);
      setResultado(respuesta);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err.message ?? "No se pudo importar el archivo.");
      setErrores(err.errores ?? []);
    } finally {
      setImportando(false);
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
      <h1 className="font-headline-lg text-headline-lg mb-6 text-primary">Importar productos</h1>

      <div className="mb-8 max-w-2xl rounded-lg bg-surface-container px-4 py-4">
        <p className="font-body-md text-body-md mb-2 text-on-surface">
          Cargá varios productos de una sola vez desde una planilla de Excel.
        </p>
        <ul className="font-body-md text-body-md list-disc pl-5 text-on-surface-variant">
          <li>Los productos se crean ocultos: no aparecen en el catálogo hasta que los publiques.</li>
          <li>La planilla no incluye fotos ni video — se cargan después, producto por producto.</li>
          <li>Si alguna fila tiene errores, no se importa ninguna. Se corrige y se vuelve a subir.</li>
        </ul>
      </div>

      <div className="mb-8 flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-60"
          >
            {descargando ? (
              <Spinner className="h-4 w-4 text-on-surface-variant" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">download</span>
            )}
            Descargar plantilla
          </button>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            La plantilla ya trae la lista de categorías cargadas.
          </p>
        </div>

        <div>
          <label
            htmlFor="archivo"
            className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
          >
            Archivo completado (.xlsx)
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
            onClick={handleImportar}
            disabled={!archivo || importando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
          >
            {importando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
            {importando ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>

      {resultado ? (
        <div className="max-w-2xl rounded-lg bg-secondary-container px-4 py-4">
          <p className="font-body-md text-body-md text-on-secondary-container">
            Se importaron {resultado.cantidad} productos como ocultos.{" "}
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

          {errores.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-outline-variant">
              <table className="w-full text-left">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
                      Fila
                    </th>
                    <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
                      Columna
                    </th>
                    <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
                      Valor
                    </th>
                    <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
                      Problema
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {errores.map((e, indice) => (
                    <tr key={`${e.fila}-${e.columna}-${indice}`} className="border-t border-outline-variant">
                      <td className="font-body-md text-body-md px-4 py-3 text-on-surface">{e.fila}</td>
                      <td className="font-body-md text-body-md px-4 py-3 text-on-surface">{e.columna}</td>
                      <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                        {String(e.valor ?? "")}
                      </td>
                      <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{e.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

export default AdminImportarProductos;
