import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import {
  createAnuncio,
  deleteAnuncio,
  getAnunciosAdmin,
  reordenarAnuncios,
  updateAnuncio,
} from "../../api/anuncios.js";

/**
 * Espejo de `LARGO_MAX_ANUNCIO` en `backend/src/controllers/anuncios.controller.js`,
 * que a su vez espeja el `@db.NVarChar(200)` del esquema. **Sync manual entre
 * repos**, mismo criterio que `botDetector.js` ↔ `nginx.conf` y que los límites
 * de medios de `MediaUploader`. Acá sirve para el contador de caracteres y el
 * `maxLength`; la autoridad sigue siendo el backend, y su mensaje se muestra
 * igual si alguna vez difieren.
 */
const LARGO_MAX = 200;

/**
 * `/catalogo/admin/configuracion/anuncios` — administra los mensajes de la
 * cinta que desfila arriba del catálogo público (`BarraAnuncios`).
 *
 * Antes eran una constante en el bundle del frontend: cambiar el copy exigía un
 * deploy. Ahora viven en la tabla `Anuncio`.
 *
 * **El reordenamiento va con botones ↑/↓, no con arrastrar y soltar.** Son
 * `<button>` reales: funcionan con teclado y con lector de pantalla sin código
 * extra, y no suman una dependencia de drag-and-drop para una lista que rara vez
 * pasa de un puñado de filas.
 */
function AdminAnuncios() {
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [textoNuevo, setTextoNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [ocupadoId, setOcupadoId] = useState(null);

  /**
   * Recarga después de una mutación exitosa. Maneja su propio error a
   * propósito: si esta recarga falla, la mutación YA se aplicó — dejar que la
   * agarre el `catch` de la mutación mostraría "no se pudo guardar" sobre algo
   * que sí se guardó, y el admin reintentaría una operación ya hecha. Mismo
   * criterio que `AdminCategorias`.
   */
  async function recargar() {
    try {
      setAnuncios(await getAnunciosAdmin());
    } catch {
      setError(
        "La operación se guardó, pero no se pudo actualizar la lista. Recargá la página para ver el estado actual.",
      );
    }
  }

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getAnunciosAdmin()
      .then((data) => {
        if (!activo) return;
        setAnuncios(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar y
      // el spinner girando para siempre.
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar los anuncios. Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  async function handleCrear(event) {
    event.preventDefault();
    const texto = textoNuevo.trim();
    if (!texto) return;

    setError(null);
    setCreando(true);
    try {
      await createAnuncio(texto);
      setTextoNuevo("");
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo crear el anuncio.");
    } finally {
      setCreando(false);
    }
  }

  async function handleGuardarEdicion(id) {
    const texto = textoEditado.trim();
    if (!texto) return;

    setError(null);
    setGuardando(true);
    try {
      await updateAnuncio(id, { texto });
      setEditandoId(null);
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo guardar el anuncio.");
    } finally {
      setGuardando(false);
    }
  }

  // Solo manda `{activo}`: el backend trata una clave ausente como "no la
  // toques", así que apagar un anuncio no reenvía —ni puede pisar— su texto.
  async function handleAlternarActivo(anuncio) {
    setError(null);
    setOcupadoId(anuncio.id);
    try {
      await updateAnuncio(anuncio.id, { activo: !anuncio.activo });
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo cambiar el estado del anuncio.");
    } finally {
      setOcupadoId(null);
    }
  }

  async function handleEliminar(id) {
    setError(null);
    setOcupadoId(id);
    try {
      await deleteAnuncio(id);
      setConfirmandoId(null);
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar el anuncio.");
    } finally {
      setOcupadoId(null);
    }
  }

  /**
   * Mueve una fila una posición y manda la secuencia COMPLETA.
   *
   * El backend reescribe todos los `orden` de una, en transacción: mandar solo
   * el par intercambiado dejaría el resto sin tocar y, ante dos ediciones
   * concurrentes, la cinta podría quedar en un orden que nadie eligió.
   */
  async function handleMover(indice, delta) {
    const destino = indice + delta;
    if (destino < 0 || destino >= anuncios.length) return;

    const reordenados = [...anuncios];
    [reordenados[indice], reordenados[destino]] = [reordenados[destino], reordenados[indice]];

    setError(null);
    setOcupadoId(anuncios[indice].id);
    // Optimista: el ↑/↓ tiene que sentirse inmediato. Si el backend rechaza, la
    // recarga del `catch` devuelve la lista al orden real.
    setAnuncios(reordenados);
    try {
      setAnuncios(await reordenarAnuncios(reordenados.map((a) => a.id)));
    } catch (err) {
      setError(err.message ?? "No se pudo reordenar.");
      await recargar();
    } finally {
      setOcupadoId(null);
    }
  }

  const claseCelda = "px-4 py-3 align-middle";
  const claseAccion =
    "font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest hover:underline disabled:opacity-60";

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Configuración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Anuncios</h1>
        <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
          Los mensajes que desfilan en la cinta de arriba del catálogo. Se muestran en el orden de
          esta lista; los desactivados quedan guardados pero no salen al sitio.
        </p>
      </div>

      <form onSubmit={handleCrear} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:max-w-lg">
          <input
            type="text"
            value={textoNuevo}
            onChange={(e) => setTextoNuevo(e.target.value)}
            maxLength={LARGO_MAX}
            aria-label="Texto del nuevo anuncio"
            placeholder="Ej: Envíos a todo el país"
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
          <span className="font-label-sm text-label-sm mt-1 block text-on-surface-variant">
            {textoNuevo.length}/{LARGO_MAX}
          </span>
        </div>
        <button
          type="submit"
          disabled={creando}
          className="font-label-md text-label-md inline-flex h-max items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
        >
          {creando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
          Agregar
        </button>
      </form>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando anuncios…</p>
        </div>
      ) : anuncios.length === 0 && !error ? (
        // El `&& !error` NO es defensivo de más: sin él, un backend caído deja
        // la lista vacía y la pantalla afirma "todavía no hay anuncios" —
        // exactamente el modo de falla que la convención del proyecto existe
        // para evitar, y encima contradiciendo al cartel de error de arriba.
        <EstadoVacio
          icono="campaign"
          titulo="Todavía no hay anuncios"
          mensaje="Agregá el primero para que aparezca la cinta arriba del catálogo."
        />
      ) : anuncios.length === 0 ? null : (
        <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Orden
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Texto
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Activo
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {anuncios.map((anuncio, indice) => (
                <tr key={anuncio.id} className="border-b border-outline-variant last:border-b-0">
                  <td className={claseCelda}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMover(indice, -1)}
                        disabled={indice === 0 || ocupadoId !== null}
                        aria-label={`Subir "${anuncio.texto}"`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                          arrow_upward
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMover(indice, 1)}
                        disabled={indice === anuncios.length - 1 || ocupadoId !== null}
                        aria-label={`Bajar "${anuncio.texto}"`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                          arrow_downward
                        </span>
                      </button>
                    </div>
                  </td>

                  <td className={`font-body-md text-body-md ${claseCelda} text-on-surface`}>
                    {editandoId === anuncio.id ? (
                      <input
                        type="text"
                        value={textoEditado}
                        onChange={(e) => setTextoEditado(e.target.value)}
                        maxLength={LARGO_MAX}
                        aria-label="Texto del anuncio"
                        className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                      />
                    ) : (
                      anuncio.texto
                    )}
                  </td>

                  <td className={claseCelda}>
                    {/* `role="switch"` con `aria-checked`: un lector de pantalla
                        anuncia el estado, cosa que un botón con solo un ícono
                        no hace. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={anuncio.activo}
                      aria-label={`Anuncio "${anuncio.texto}" activo`}
                      onClick={() => handleAlternarActivo(anuncio)}
                      disabled={ocupadoId !== null}
                      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-60 ${
                        anuncio.activo ? "bg-secondary" : "bg-surface-variant"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm transition-transform ${
                          anuncio.activo ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>

                  <td className={claseCelda}>
                    <div className="flex items-center gap-4">
                      {editandoId === anuncio.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGuardarEdicion(anuncio.id)}
                            disabled={guardando}
                            className={`${claseAccion} text-secondary`}
                          >
                            {guardando ? <Spinner className="h-3.5 w-3.5" decorativo /> : null}
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className={`${claseAccion} text-on-surface-variant`}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmandoId(null);
                            setEditandoId(anuncio.id);
                            setTextoEditado(anuncio.texto);
                          }}
                          className={`${claseAccion} text-secondary`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                          Editar
                        </button>
                      )}

                      {confirmandoId === anuncio.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md text-on-surface-variant">
                            ¿Confirmar?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEliminar(anuncio.id)}
                            disabled={ocupadoId === anuncio.id}
                            className={`${claseAccion} text-error`}
                          >
                            {ocupadoId === anuncio.id ? <Spinner className="h-3.5 w-3.5" decorativo /> : null}
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoId(null)}
                            className={`${claseAccion} text-on-surface-variant`}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoId(null);
                            setConfirmandoId(anuncio.id);
                          }}
                          className={`${claseAccion} text-error`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default AdminAnuncios;
