import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MediaUploader from "../../components/MediaUploader.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import { createProduct, deletePhoto, getProductById, updateProduct } from "../../api/products.js";
import { formatearPrecioInput, formatearPrecioParaEdicion } from "../../utils/formato.js";
import { getCategorias } from "../../api/categorias.js";

const SUGERENCIAS_ETIQUETA = ["Exclusivo", "Nuevo", "Best Seller", "Trending", "Popular"];

/**
 * Shared create/edit form.
 *
 * Routes (per design.md's Interfaces/Contracts routing table):
 *   - `/catalogo/admin/nuevo`        -> create mode (no `:id` param)
 *   - `/catalogo/admin/:id/editar`   -> edit mode (prefills via getProductById)
 *
 * `etiqueta` is free-text per spec's open question resolution — an `<input>`
 * with a `<datalist>` of suggestions, not a hard enum.
 *
 * MediaUploader (PR 2) already caps fotos/video in its own UI, but this form
 * is the final guard before calling the mock API — `createProduct`/
 * `updateProduct` (PR 1) re-validate max 10 fotos / max 1 video server-side
 * (D6/spec), so a thrown `Error` here always means real invalid state, not a
 * UI bug users could otherwise bypass.
 */
function AdminProductoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [cargando, setCargando] = useState(esEdicion);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const [productoId, setProductoId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioVisual, setPrecioVisual] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [caracteristicas, setCaracteristicas] = useState([]);
  const [nuevaCaracteristica, setNuevaCaracteristica] = useState("");
  const [fotos, setFotos] = useState([]);
  const [video, setVideo] = useState(null);

  useEffect(() => {
    if (!esEdicion) return;

    let activo = true;
    setCargando(true);

    getProductById(id, { admin: true }).then((producto) => {
      if (!activo) return;

      if (!producto) {
        setNoEncontrado(true);
        setCargando(false);
        return;
      }

      setProductoId(producto.id);
      setNombre(producto.nombre);
      setDescripcion(producto.descripcion ?? "");
      const { crudo, formateado } = producto.precio
        ? formatearPrecioParaEdicion(String(producto.precio))
        : { crudo: "", formateado: "" };
      setPrecio(crudo);
      setPrecioVisual(formateado);
      setEtiqueta(producto.etiqueta ?? "");
      setCategoriaId(producto.categoria?.id ? String(producto.categoria.id) : "");
      setCaracteristicas(producto.caracteristicas ?? []);
      setFotos(producto.fotos ?? []);
      setVideo(producto.video ?? null);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [id, esEdicion]);

  useEffect(() => {
    let activo = true;
    getCategorias().then((data) => {
      if (activo) setCategorias(data);
    });
    return () => {
      activo = false;
    };
  }, []);

  function agregarCaracteristica() {
    const texto = nuevaCaracteristica.trim();
    if (!texto) return;
    setCaracteristicas((prev) => [...prev, { id: `tmp-${Date.now()}`, texto }]);
    setNuevaCaracteristica("");
  }

  function eliminarCaracteristica(index) {
    setCaracteristicas((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * `MediaUploader` (PR 2) owns the per-photo remove button and reports the
   * next `fotos` array via `onChangeFotos`. This wrapper diffs against the
   * current state: if a removed photo was already persisted (numeric id
   * from the store), it's deleted via `deletePhoto` immediately so `orden`
   * stays re-normalized server-side (spec: "Removing a single photo").
   * Freshly added, not-yet-saved photos (client-generated preview, no
   * numeric id) are only dropped from local state.
   */
  async function handleChangeFotos(siguientesFotos) {
    const idsRestantes = new Set(siguientesFotos.map((f) => f.id));
    const eliminada = fotos.find((f) => typeof f.id === "number" && !idsRestantes.has(f.id));

    if (esEdicion && productoId && eliminada) {
      try {
        const actualizado = await deletePhoto(productoId, eliminada.id);
        setFotos(actualizado.fotos);
        return;
      } catch (err) {
        setError(err.message ?? "No se pudo eliminar la foto.");
        return;
      }
    }

    setFotos(siguientesFotos);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setGuardando(true);

    const data = {
      nombre,
      descripcion,
      precio,
      etiqueta: etiqueta.trim() === "" ? null : etiqueta.trim(),
      categoriaId: categoriaId === "" ? null : categoriaId,
      caracteristicas: caracteristicas.map((c) => ({ texto: c.texto })),
      // Persisted photos (numeric id, no local `file`) are referenced by id
      // so the backend keeps them as-is; freshly picked photos (`f.file`
      // set by MediaUploader) are sent as real bytes for a new Drive upload.
      fotosExistentes: fotos.filter((f) => typeof f.id === "number" && !f.file).map((f) => f.id),
      fotosNuevas: fotos.filter((f) => f.file).map((f) => f.file),
      // `video` is null (removed by the user) vs. unchanged (persisted,
      // no `file`) vs. replaced (`file` set) — three distinct states the
      // backend needs disambiguated via `eliminarVideo`.
      videoNuevo: video?.file ?? null,
      eliminarVideo: !video,
    };

    try {
      if (esEdicion) {
        await updateProduct(productoId, data);
      } else {
        await createProduct(data);
      }
      navigate("/catalogo/admin");
    } catch (err) {
      setError(err.message ?? "No se pudo guardar el producto.");
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
        <Spinner className="h-8 w-8 text-on-surface-variant" />
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando producto…</p>
      </div>
    );
  }

  if (noEncontrado) {
    return (
      <EstadoVacio
        icono="search_off"
        titulo="Producto no encontrado"
        mensaje="El producto que intentás editar no existe o fue eliminado."
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-margin-mobile py-8 md:px-margin-desktop md:py-16">
      <div className="mb-6">
        <BotonVolver />
      </div>
      <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
        Panel de administración
      </span>
      <h1 className="font-headline-lg text-headline-lg mb-10 text-primary">
        {esEdicion ? "Editar producto" : "Agregar producto"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div>
          <label htmlFor="nombre" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="descripcion"
            className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
          >
            Descripción
          </label>
          <textarea
            id="descripcion"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="precio" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
              Precio
            </label>
            <div className="flex items-center rounded-lg border border-outline-variant bg-surface px-4 focus-within:border-primary">
              <span className="font-body-md text-body-md text-on-surface-variant">$</span>
              <input
                id="precio"
                type="text"
                inputMode="decimal"
                required
                value={precioVisual}
                onChange={(e) => {
                  const { formateado, crudo } = formatearPrecioInput(e.target.value);
                  setPrecioVisual(formateado);
                  setPrecio(crudo);
                }}
                className="font-body-md text-body-md w-full bg-transparent px-2 py-3 text-on-surface focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="etiqueta" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
              Etiqueta (opcional)
            </label>
            <input
              id="etiqueta"
              type="text"
              list="sugerencias-etiqueta"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
            <datalist id="sugerencias-etiqueta">
              {SUGERENCIAS_ETIQUETA.map((sugerencia) => (
                <option key={sugerencia} value={sugerencia} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="categoria" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
              Categoría (opcional)
            </label>
            <select
              id="categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
            Características
          </h3>
          <div className="mb-3 flex flex-col gap-2">
            {caracteristicas.map((caracteristica, index) => (
              <div
                key={caracteristica.id}
                className="flex items-center justify-between rounded-lg bg-surface-container px-4 py-2"
              >
                <span className="font-body-md text-body-md text-on-surface">{caracteristica.texto}</span>
                <button
                  type="button"
                  onClick={() => eliminarCaracteristica(index)}
                  aria-label={`Eliminar característica ${caracteristica.texto}`}
                  className="text-on-surface-variant hover:text-error"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaCaracteristica}
              onChange={(e) => setNuevaCaracteristica(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarCaracteristica();
                }
              }}
              placeholder="Ej: Cuero genuino"
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={agregarCaracteristica}
              className="font-label-md text-label-md shrink-0 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
            >
              Agregar
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
            Medios
          </h3>
          <MediaUploader fotos={fotos} video={video} onChangeFotos={handleChangeFotos} onChangeVideo={setVideo} />
        </div>

        {error ? (
          <p className="font-body-md text-body-md rounded-lg bg-error-container px-4 py-3 text-on-error-container">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={guardando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
          >
            {guardando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/catalogo/admin")}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-6 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}

export default AdminProductoForm;
