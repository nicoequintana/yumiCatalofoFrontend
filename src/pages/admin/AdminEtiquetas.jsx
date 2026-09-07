import { useEffect, useMemo, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import Badge from "../../components/Badge.jsx";
import { claseTablaApilada } from "../../components/admin/clasesTabla.js";
import {
  createEtiqueta,
  deleteEtiqueta,
  getEtiquetasAdmin,
  getOpcionesColor,
  updateEtiqueta,
} from "../../api/etiquetas.js";

/**
 * Espejo de `LARGO_MAX_ETIQUETA` en
 * `backend/src/controllers/etiquetas.controller.js`, que a su vez espeja el
 * `@db.NVarChar(40)` del esquema. **Sync manual entre repos**, mismo criterio
 * que `LARGO_MAX` de `AdminAnuncios`. Acá sirve para el contador y el
 * `maxLength`; la autoridad sigue siendo el backend.
 */
const LARGO_MAX = 40;

/**
 * `/catalogo/admin/configuracion/etiquetas` — administra las etiquetas
 * comerciales que se muestran sobre los productos del catálogo ("Nuevo",
 * "Best Seller"). Cada producto lleva una sola.
 *
 * El chip de cada fila se pinta con `Badge` (`components/Badge.jsx`), el
 * MISMO componente que usa la ficha pública: acá NO se define un chip propio
 * — sería una segunda casa de "cómo se ve un chip", con el mismo cálculo de
 * `style` y el mismo fallback al token por defecto, en la misma feature que
 * vino a reducir casas.
 */
/**
 * La paleta de una fila: un botón por color, con el color puesto.
 *
 * Reemplazó a un `<select>` de 21 opciones. Un desplegable obliga a leer
 * nombres ("Ciruela", "Vino", "Ocre") para adivinar un color, que es
 * exactamente lo que un selector de color no debería pedir.
 *
 * **La marca de "en uso" se pinta con el color de TEXTO de cada swatch**, que
 * el backend ya emite emparejado con su fondo y con contraste WCAG medido. Es
 * lo que garantiza que el tilde y el punto se vean sobre los veinte fondos, sin
 * inventar un color de marca que sobre `ARENA` o `CELESTE` desaparecería.
 *
 * Un color ya usado por otra etiqueta se MARCA, no se bloquea: dos etiquetas
 * con el mismo color son legales, y el panel no está para decidir eso.
 */
function PaletaColores({ etiqueta, colores, usoPorColor, onElegir, deshabilitado }) {
  const opciones = [{ id: "", nombre: "Por defecto", fondo: null, texto: null }, ...colores];

  return (
    <div
      role="group"
      aria-label={`Color de ${etiqueta.nombre}`}
      className="flex max-w-xs flex-wrap gap-2"
    >
      {opciones.map((opcion) => {
        const seleccionado = (etiqueta.color ?? "") === opcion.id;
        const otras = (usoPorColor.get(opcion.id) ?? []).filter((n) => n !== etiqueta.nombre);
        const enUso = otras.length > 0;
        const leyenda = enUso ? `${opcion.nombre} — en uso por ${otras.join(", ")}` : opcion.nombre;

        return (
          <button
            key={opcion.id || "defecto"}
            type="button"
            disabled={deshabilitado}
            aria-pressed={seleccionado}
            title={leyenda}
            onClick={() => onElegir(opcion.id)}
            style={
              opcion.fondo
                ? { backgroundColor: `rgb(${opcion.fondo})`, color: `rgb(${opcion.texto})` }
                : undefined
            }
            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-40 max-md:h-11 max-md:w-11 ${
              // "Por defecto" NO es un color más de la paleta, y no puede
              // parecerlo: pinta con `tertiary`, que a ojo es igual a `ARENA`,
              // la de al lado. El borde punteado y la separación lo sacan de la
              // fila de veinte y lo leen como "ninguno".
              opcion.fondo
                ? "bg-transparent"
                : "mr-2 border-2 border-dashed border-outline bg-tertiary/40 text-on-surface"
            } ${seleccionado ? "ring-2 ring-primary" : "ring-1 ring-outline-variant"}`}
          >
            {seleccionado ? (
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                check
              </span>
            ) : null}
            {enUso && !seleccionado ? (
              <span
                aria-hidden="true"
                className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-current"
              />
            ) : null}
            <span className="sr-only">{leyenda}</span>
          </button>
        );
      })}
    </div>
  );
}

function AdminEtiquetas() {
  const [etiquetas, setEtiquetas] = useState([]);
  const [colores, setColores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [ocupadoId, setOcupadoId] = useState(null);

  /**
   * Recarga después de una mutación exitosa. Maneja su propio error a
   * propósito, mismo criterio que `AdminAnuncios`/`AdminCategorias`: si esta
   * recarga falla, la mutación YA se aplicó — dejar que la agarre el `catch`
   * de la mutación mostraría "no se pudo guardar" sobre algo que sí se
   * guardó.
   */
  async function recargar() {
    try {
      setEtiquetas(await getEtiquetasAdmin());
    } catch {
      setError(
        "La operación se guardó, pero no se pudo actualizar la lista. Recargá la página para ver el estado actual.",
      );
    }
  }

  useEffect(() => {
    let activo = true;
    setCargando(true);

    // La paleta de colores es secundaria: si falla, el `<select>` de cada
    // fila queda solo con "Por defecto" en vez de tumbar la pantalla entera
    // con el error de carga de las etiquetas.
    Promise.all([getEtiquetasAdmin(), getOpcionesColor().catch(() => ({ colores: [] }))])
      .then(([etiquetasData, opcionesColor]) => {
        if (!activo) return;
        setEtiquetas(etiquetasData);
        setColores(opcionesColor?.colores ?? []);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin
      // manejar y el spinner girando para siempre.
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar las etiquetas. Revisá tu conexión e intentá de nuevo.");
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
      await createEtiqueta(nombre, null);
      setNombreNuevo("");
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo crear la etiqueta.");
    } finally {
      setCreando(false);
    }
  }

  async function handleGuardarEdicion(id) {
    const nombre = nombreEditado.trim();
    if (!nombre) return;

    setError(null);
    setGuardando(true);
    try {
      await updateEtiqueta(id, { nombre });
      setEditandoId(null);
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo renombrar la etiqueta.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarColor(etiqueta, valor) {
    setError(null);
    setOcupadoId(etiqueta.id);
    try {
      await updateEtiqueta(etiqueta.id, { color: valor || null });
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo cambiar el color.");
    } finally {
      setOcupadoId(null);
    }
  }

  async function handleEliminar(id) {
    setError(null);
    setOcupadoId(id);
    try {
      await deleteEtiqueta(id);
      setConfirmandoId(null);
      await recargar();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar la etiqueta.");
    } finally {
      setOcupadoId(null);
    }
  }

  /**
   * Qué etiqueta usa cada color, para marcar los ocupados en la paleta.
   *
   * Se deriva ACÁ y no en el backend, y no contradice la regla de que el
   * frontend no recalcula lo que el backend sabe: no hay ninguna regla de
   * negocio que espejar, es una agrupación de la MISMA lista que esta pantalla
   * está renderizando. Como sale del array que ya se dibuja, no puede
   * desincronizarse de lo que se ve. Pedirlo por API sería un endpoint nuevo
   * para contestar algo que ya está en memoria.
   */
  const usoPorColor = useMemo(() => {
    const mapa = new Map();
    for (const e of etiquetas) {
      const clave = e.color ?? "";
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(e.nombre);
    }
    return mapa;
  }, [etiquetas]);

  const claseCelda = "px-4 py-3 align-middle";
  const claseAccion =
    "font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest hover:underline disabled:opacity-60 max-md:min-h-11";

  /**
   * Editar y Eliminar van SOLO CON EL ÍCONO: con el nombre de la etiqueta
   * adentro, cada fila repetía tres veces el mismo texto ("Nuevo", "Editar
   * Nuevo", "Eliminar Nuevo") y la columna de acciones se comía el ancho.
   *
   * El nombre completo NO desaparece, se mueve: viaja en un `<span
   * className="sr-only">` para que el botón siga anunciándose como "Editar
   * Nuevo" a un lector de pantalla, y en `title` para que se vea al pasar el
   * mouse. Un botón de ícono sin nombre accesible anunciaría el texto de la
   * ligadura ("edit", "delete") o directamente nada.
   *
   * `h-11 w-11` en mobile (44px) es el mínimo táctil que el resto del panel ya
   * respeta; en escritorio baja a 36px, donde el puntero es preciso. Reemplaza
   * el `hover:underline` por un fondo, que es la afordancia que le queda a un
   * ícono suelto.
   */
  const claseAccionIcono =
    "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-transparent max-md:h-11 max-md:w-11";

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Configuración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Etiquetas</h1>
        <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
          Las etiquetas que se muestran sobre los productos del catálogo. Cada producto
          lleva una sola. El color es opcional: sin elegir uno, la etiqueta se pinta con
          el color por defecto del sitio.
        </p>
      </div>

      <form onSubmit={handleCrear} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:max-w-lg">
          <input
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            maxLength={LARGO_MAX}
            aria-label="Nombre de la nueva etiqueta"
            placeholder="Ej: Nuevo"
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
          <span className="font-label-sm text-label-sm mt-1 block text-on-surface-variant">
            {nombreNuevo.length}/{LARGO_MAX}
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
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando etiquetas…</p>
        </div>
      ) : etiquetas.length === 0 && !error ? (
        // El `&& !error` NO es defensivo de más: sin él, un backend caído
        // deja la lista vacía y la pantalla afirma "todavía no hay
        // etiquetas" — exactamente el modo de falla que la convención del
        // proyecto existe para evitar. Mismo criterio que `AdminAnuncios`.
        <EstadoVacio
          icono="label"
          titulo="Todavía no hay etiquetas"
          mensaje="Agregá la primera para poder asignarla a los productos."
        />
      ) : etiquetas.length === 0 ? null : (
        <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
          <table role="table" className={`${claseTablaApilada} w-full min-w-[640px] text-left`}>
            <thead role="rowgroup">
              <tr role="row" className="border-b border-outline-variant">
                <th
                  role="columnheader"
                  className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant"
                >
                  Etiqueta
                </th>
                <th
                  role="columnheader"
                  className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant"
                >
                  Color
                </th>
                <th
                  role="columnheader"
                  className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant"
                >
                  Productos
                </th>
                <th
                  role="columnheader"
                  className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {etiquetas.map((etiqueta) => (
                <tr
                  key={etiqueta.id}
                  role="row"
                  className="border-b border-outline-variant last:border-b-0"
                >
                  <td role="cell" data-celda="identidad" className={claseCelda}>
                    {editandoId === etiqueta.id ? (
                      <div className="w-full max-w-xs">
                        <input
                          type="text"
                          value={nombreEditado}
                          onChange={(e) => setNombreEditado(e.target.value)}
                          maxLength={LARGO_MAX}
                          aria-label="Nombre de la etiqueta"
                          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                        />
                        <span className="font-label-sm text-label-sm mt-1 block text-on-surface-variant">
                          {nombreEditado.length}/{LARGO_MAX}
                        </span>
                      </div>
                    ) : (
                      <Badge etiqueta={etiqueta} />
                    )}
                  </td>

                  <td role="cell" data-label="Color" className={claseCelda}>
                    <PaletaColores
                      etiqueta={etiqueta}
                      colores={colores}
                      usoPorColor={usoPorColor}
                      deshabilitado={ocupadoId === etiqueta.id}
                      onElegir={(valor) => handleCambiarColor(etiqueta, valor)}
                    />
                  </td>

                  <td
                    role="cell"
                    data-label="Productos"
                    className={`font-body-md text-body-md ${claseCelda} text-on-surface-variant`}
                  >
                    {etiqueta.cantidadProductos}
                  </td>

                  <td role="cell" data-celda="acciones" className={claseCelda}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {editandoId === etiqueta.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGuardarEdicion(etiqueta.id)}
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
                            setEditandoId(etiqueta.id);
                            setNombreEditado(etiqueta.nombre);
                          }}
                          title={`Editar ${etiqueta.nombre}`}
                          className={`${claseAccionIcono} text-secondary`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                            edit
                          </span>
                          <span className="sr-only">Editar {etiqueta.nombre}</span>
                        </button>
                      )}

                      {confirmandoId === etiqueta.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md text-on-surface-variant">
                            ¿Confirmar?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEliminar(etiqueta.id)}
                            disabled={ocupadoId === etiqueta.id}
                            className={`${claseAccion} text-error`}
                          >
                            {ocupadoId === etiqueta.id ? (
                              <Spinner className="h-3.5 w-3.5" decorativo />
                            ) : null}
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
                        <>
                          <button
                            type="button"
                            disabled={etiqueta.cantidadProductos > 0}
                            aria-describedby={
                              etiqueta.cantidadProductos > 0 ? `motivo-${etiqueta.id}` : undefined
                            }
                            onClick={() => {
                              setEditandoId(null);
                              setConfirmandoId(etiqueta.id);
                            }}
                            title={`Eliminar ${etiqueta.nombre}`}
                            className={`${claseAccionIcono} text-error`}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                              delete
                            </span>
                            <span className="sr-only">Eliminar {etiqueta.nombre}</span>
                          </button>
                          {etiqueta.cantidadProductos > 0 ? (
                            <span id={`motivo-${etiqueta.id}`} className="sr-only">
                              No se puede eliminar: {etiqueta.cantidadProductos} producto
                              {etiqueta.cantidadProductos === 1 ? "" : "s"} la usa
                              {etiqueta.cantidadProductos === 1 ? "" : "n"}.
                            </span>
                          ) : null}
                        </>
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

export default AdminEtiquetas;
