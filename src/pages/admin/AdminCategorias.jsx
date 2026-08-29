import { useEffect, useRef, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import {
  createCategoria,
  deleteCategoria,
  destacarCategoriaEnHome,
  getCategorias,
  quitarImagenCategoria,
  subirImagenCategoria,
  updateCategoria,
} from "../../api/categorias.js";

/**
 * Cuántas categorías admite la home a la vez. Espejo de `MAX_CATEGORIAS_HOME`
 * en `backend/src/controllers/categorias.controller.js`, que es donde el tope
 * se aplica de verdad. Acá sólo alimenta el texto de ayuda y el contador: la
 * validación real es del servidor, y su mensaje es el que se muestra si el
 * admin igual intenta una cuarta.
 */
const MAX_CATEGORIAS_HOME = 3;

/**
 * `/catalogo/admin/configuracion/categorias` — la lista de categorías y, desde
 * el 29/08/2026, también lo que la home pública muestra en su sección "Explorá
 * por categoría": qué categorías aparecen y con qué foto.
 *
 * Las categorías se asignan a productos desde el desplegable de
 * `AdminProductoForm.jsx`; esta pantalla maneja la lista en sí.
 */
function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  // Un `<input type="file">` por fila, indexado por id de categoría. El botón
  // visible lo dispara por ref: así el control nativo queda oculto (`sr-only`)
  // sin perder ni el selector del sistema ni el nombre accesible.
  const inputsArchivo = useRef({});

  // Estado de las operaciones de la home. Se guarda por id, no como un booleano
  // global: con un flag único, subir una foto deshabilitaría los controles de
  // TODAS las filas y la pantalla se leería como trabada.
  const [ocupadaId, setOcupadaId] = useState(null);

  // Sólo el contador. La pantalla NO ordena las destacadas: se sacó por pedido
  // explícito (29/08/2026). El orden en la home sale del `ordenHome` que el
  // backend asigna al marcar (cada nueva va al final), o sea el orden en que se
  // eligieron — determinista y sin ningún control que mantener.
  const cantidadDestacadas = categorias.filter((categoria) => categoria.destacadaEnHome).length;

  /**
   * Recarga la lista después de una mutación exitosa. Maneja su propio error
   * a propósito: si esta recarga falla, la mutación YA se aplicó — dejar que
   * el catch de la mutación lo agarre mostraba "No se pudo crear/renombrar/
   * eliminar la categoría", y el admin reintentaba algo que ya pasó.
   */
  async function cargarCategorias() {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch {
      setError(
        "La operación se guardó, pero no se pudo actualizar la lista. Recargá la página para ver el estado actual.",
      );
    }
  }

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getCategorias()
      .then((data) => {
        if (!activo) return;
        setCategorias(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre — el admin no tiene forma de saber
      // que el problema es la conexión.
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar las categorías. Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  async function handleCrear(event) {
    event.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return;

    setError(null);
    setCreando(true);
    try {
      await createCategoria(nombre);
      setNombreNuevo("");
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo crear la categoría.");
    } finally {
      setCreando(false);
    }
  }

  function iniciarEdicion(categoria) {
    setConfirmandoId(null);
    setEditandoId(categoria.id);
    setNombreEditado(categoria.nombre);
  }

  async function handleGuardarEdicion(id) {
    const nombre = nombreEditado.trim();
    if (!nombre) return;

    setError(null);
    setGuardandoEdicion(true);
    try {
      await updateCategoria(id, nombre);
      setEditandoId(null);
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo renombrar la categoría.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handleEliminar(id) {
    setError(null);
    setEliminandoId(id);
    try {
      await deleteCategoria(id);
      setConfirmandoId(null);
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar la categoría.");
    } finally {
      setEliminandoId(null);
    }
  }

  async function handleToggleHome(categoria) {
    setError(null);
    setOcupadaId(categoria.id);
    try {
      await destacarCategoriaEnHome(categoria.id, !categoria.destacadaEnHome);
      await cargarCategorias();
    } catch (err) {
      // El mensaje del backend es el que explica el tope de 3 — no se
      // reemplaza por uno genérico.
      setError(err.message ?? "No se pudo actualizar la selección de la home.");
    } finally {
      setOcupadaId(null);
    }
  }

  async function handleSubirImagen(categoria, archivo) {
    if (!archivo) return;

    setError(null);
    setOcupadaId(categoria.id);
    try {
      await subirImagenCategoria(categoria.id, archivo);
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo subir la imagen.");
    } finally {
      setOcupadaId(null);
    }
  }

  async function handleQuitarImagen(categoria) {
    setError(null);
    setOcupadaId(categoria.id);
    try {
      await quitarImagenCategoria(categoria.id);
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo quitar la imagen.");
    } finally {
      setOcupadaId(null);
    }
  }

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Panel de administración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Categorías</h1>
        <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
          Además de organizar los productos, acá se define la sección{" "}
          <strong className="font-semibold text-on-surface">«Explorá por categoría»</strong> de la
          home: marcá hasta {MAX_CATEGORIAS_HOME} categorías y asignales una foto.{" "}
          {cantidadDestacadas === 0
            ? "Sin ninguna marcada, esa sección no se muestra."
            : `Marcadas: ${cantidadDestacadas} de ${MAX_CATEGORIAS_HOME}.`}
        </p>
      </div>

      <form onSubmit={handleCrear} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre de la nueva categoría"
          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none sm:max-w-sm"
        />
        <button
          type="submit"
          disabled={creando}
          className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
        >
          {creando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
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
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando categorías…</p>
        </div>
      ) : categorias.length === 0 ? (
        <EstadoVacio
          icono="sell"
          titulo="Todavía no hay categorías"
          mensaje="Agregá la primera categoría para poder asignarla a los productos."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          {/* `table-fixed` con anchos declarados en los `<th>`: con el layout
              automático, el aviso rojo de "sin productos publicados" ensanchaba
              su columna y REACOMODABA toda la tabla al prenderse un switch —
              las demás columnas se encogían y las acciones saltaban de lugar.
              Con anchos fijos el texto envuelve dentro de su columna y ninguna
              fila puede mover a las otras. */}
          <table className="w-full min-w-[760px] table-fixed text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm w-[22%] px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th className="font-label-sm text-label-sm w-[10%] px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Productos
                </th>
                <th className="font-label-sm text-label-sm w-[18%] px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Foto
                </th>
                <th className="font-label-sm text-label-sm w-[28%] px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  En la home
                </th>
                <th className="font-label-sm text-label-sm w-[22%] px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface">
                    {editandoId === categoria.id ? (
                      <input
                        type="text"
                        value={nombreEditado}
                        onChange={(e) => setNombreEditado(e.target.value)}
                        className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                      />
                    ) : (
                      categoria.nombre
                    )}
                  </td>
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                    {categoria.cantidadProductos}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
                        {categoria.imagenUrl ? (
                          <img
                            src={categoria.imagenUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[20px] text-on-surface-variant opacity-40"
                          >
                            category
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Un `<button>` que dispara el input por ref, no un
                            `<label>` envolviéndolo. El label también funciona
                            —el click se reenvía igual—, pero deja el control
                            como texto suelto mientras el resto de la fila son
                            botones, y arrastrar sobre él selecciona el texto en
                            vez de accionar. Con un botón real la fila queda con
                            una sola estética y el gesto es inequívoco. */}
                        <button
                          type="button"
                          onClick={() => inputsArchivo.current[categoria.id]?.click()}
                          disabled={ocupadaId === categoria.id}
                          aria-label={`${categoria.imagenUrl ? "Cambiar" : "Subir"} la foto de ${categoria.nombre}`}
                          title={categoria.imagenUrl ? "Cambiar foto" : "Subir foto"}
                          className="text-secondary flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high disabled:opacity-60"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                            upload
                          </span>
                        </button>

                        <input
                          ref={(el) => {
                            inputsArchivo.current[categoria.id] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label={`Foto de ${categoria.nombre}`}
                          className="sr-only"
                          onChange={(e) => {
                            handleSubirImagen(categoria, e.target.files?.[0]);
                            // Se limpia el input: sin esto, volver a elegir EL
                            // MISMO archivo no dispara `change` y la subida no
                            // se reintenta nunca.
                            e.target.value = "";
                          }}
                        />

                        {categoria.imagenUrl ? (
                          <button
                            type="button"
                            onClick={() => handleQuitarImagen(categoria)}
                            disabled={ocupadaId === categoria.id}
                            aria-label={`Quitar la foto de ${categoria.nombre}`}
                            title="Quitar foto"
                            className="text-error flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high disabled:opacity-60"
                          >
                            {/* `hide_image`, no `delete`: en la misma fila hay un
                                tacho que borra la CATEGORÍA entera, y dos íconos
                                iguales para dos borrados de alcance muy distinto
                                es exactamente el accidente que hay que evitar. */}
                            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                              hide_image
                            </span>
                          </button>
                        ) : null}
                      </div>

                      {ocupadaId === categoria.id ? <Spinner className="h-4 w-4" /> : null}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Mismo switch que los toggles de `AdminProductos`
                          (`role="switch"` + `aria-checked` sobre un `<button>`,
                          no un `<input type="checkbox">`): un lector de pantalla
                          lo anuncia como interruptor y el panel mantiene una
                          sola estética de control. */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={categoria.destacadaEnHome}
                        aria-label={`Mostrar ${categoria.nombre} en la home`}
                        onClick={() => handleToggleHome(categoria)}
                        disabled={ocupadaId === categoria.id}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 xl:h-6 xl:w-11 ${
                          categoria.destacadaEnHome ? "bg-secondary" : "bg-outline-variant"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface-container-lowest shadow transition-transform xl:h-4 xl:w-4 ${
                            categoria.destacadaEnHome
                              ? "translate-x-5 xl:translate-x-6"
                              : "translate-x-0.5 xl:translate-x-1"
                          }`}
                        />
                      </button>
                      {ocupadaId === categoria.id ? (
                        <Spinner className="h-3.5 w-3.5 text-on-surface-variant" />
                      ) : null}
                    </div>

                    {/* Para esto existe `cantidadPublicados` aparte de
                        `cantidadProductos`: cuenta sólo lo visible y con
                        stock. Una categoría marcada sin nada publicado se ve
                        perfecta en la home y su "Ver productos" cae en una
                        grilla vacía. No se bloquea —la selección es del
                        admin— pero no puede pasar en silencio. */}
                    {categoria.destacadaEnHome && categoria.cantidadPublicados === 0 ? (
                      <p className="font-body-md mt-1 flex items-start gap-1 text-[11px] leading-tight text-error">
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          warning
                        </span>
                        Sin productos publicados: la card lleva a una grilla vacía.
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {editandoId === categoria.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGuardarEdicion(categoria.id)}
                            disabled={guardandoEdicion || eliminandoId === categoria.id}
                            className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest text-secondary hover:underline disabled:opacity-60"
                          >
                            {guardandoEdicion ? <Spinner className="h-3.5 w-3.5" /> : null}
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:underline"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(categoria)}
                          aria-label={`Renombrar ${categoria.nombre}`}
                          title="Renombrar"
                          className="text-secondary flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high disabled:opacity-60"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                            edit
                          </span>
                        </button>
                      )}

                      {confirmandoId === categoria.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md text-on-surface-variant">¿Confirmar?</span>
                          <button
                            type="button"
                            onClick={() => handleEliminar(categoria.id)}
                            disabled={eliminandoId === categoria.id || guardandoEdicion}
                            className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest text-error hover:underline disabled:opacity-60"
                          >
                            {eliminandoId === categoria.id ? <Spinner className="h-3.5 w-3.5" /> : null}
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoId(null)}
                            className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoId(null);
                            setConfirmandoId(categoria.id);
                          }}
                          aria-label={`Eliminar la categoría ${categoria.nombre}`}
                          title="Eliminar categoría"
                          className="text-error flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high disabled:opacity-60"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                            delete
                          </span>
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

export default AdminCategorias;
