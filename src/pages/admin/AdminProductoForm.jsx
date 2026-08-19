import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MediaUploader from "../../components/MediaUploader.jsx";
import ListaDinamica from "../../components/ListaDinamica.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import FichaProducto from "../../components/FichaProducto.jsx";
import { createProduct, deletePhoto, getProductById, updateProduct } from "../../api/products.js";
import { formatearPrecioInput, formatearPrecioParaEdicion } from "../../utils/formato.js";
import { getCategorias } from "../../api/categorias.js";

const SUGERENCIAS_ETIQUETA = ["Exclusivo", "Nuevo", "Best Seller", "Trending", "Popular"];

/**
 * Shared create/edit editor.
 *
 * Routes:
 *   - `/catalogo/admin/productos/nuevo`        -> create mode (no `:id` param)
 *   - `/catalogo/admin/productos/:id/editar`   -> edit mode (prefills via getProductById)
 *
 * Two-pane layout: the form on the left, a live preview of the public product
 * sheet on the right, rendered by the very same `FichaProducto` the public
 * `/producto/:id` page uses. "Live" means live in local React state only —
 * nothing is persisted until submit, which still sends one `createProduct` /
 * `updateProduct` call exactly as before. Below `lg` the two panes become
 * Editar / Vista previa tabs, since they can't sit side by side.
 *
 * `etiqueta` is free-text — an `<input>` with a `<datalist>` of suggestions,
 * not a hard enum.
 *
 * MediaUploader caps fotos/video in its own UI, but this form is the final
 * guard before the API — `createProduct`/`updateProduct` re-validate max 10
 * fotos / max 1 video server-side, so a thrown `Error` here always means real
 * invalid state, not a UI bug users could otherwise bypass.
 */
function AdminProductoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [cargando, setCargando] = useState(esEdicion);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  // Aparte de `error`: que no carguen las categorías degrada un campo opcional,
  // no impide guardar el producto — merece un aviso propio, no el error general.
  const [errorCategorias, setErrorCategorias] = useState(null);
  // Falla al traer el producto a editar: bloquea la pantalla entera, a
  // diferencia de `error` (fallo al guardar, con el form ya cargado).
  const [errorCarga, setErrorCarga] = useState(null);
  const [sucio, setSucio] = useState(false);
  const [panelActivo, setPanelActivo] = useState("form");
  const [anchoPreview, setAnchoPreview] = useState("desktop");
  // Arranca en plantilla: mientras se carga, la pregunta es "¿qué me falta?".
  // La vista real responde otra pregunta —"¿cómo queda?"— y sirve justo antes
  // de guardar, así que se elige a mano.
  const [plantillaCompleta, setPlantillaCompleta] = useState(true);
  const formRef = useRef(null);

  const [productoId, setProductoId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioVisual, setPrecioVisual] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [stock, setStock] = useState("0");
  const [categorias, setCategorias] = useState([]);
  const [caracteristicas, setCaracteristicas] = useState([]);
  const [nuevaCaracteristica, setNuevaCaracteristica] = useState("");
  const [fotos, setFotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [fraseComercial, setFraseComercial] = useState("");
  const [porQueLoVasAQuerer, setPorQueLoVasAQuerer] = useState("");
  const [tePasaEsto, setTePasaEsto] = useState("");
  const [beneficios, setBeneficios] = useState([]);
  const [usos, setUsos] = useState([]);
  const [idealPara, setIdealPara] = useState([]);
  const [incluye, setIncluye] = useState([]);
  const [especificaciones, setEspecificaciones] = useState([]);
  const [nuevaSpecNombre, setNuevaSpecNombre] = useState("");
  const [nuevaSpecValor, setNuevaSpecValor] = useState("");

  // Read-only catalog placement, owned by the product list (it saves each of
  // these instantly via PATCH). Mirrored here so the admin sees the product's
  // full state without leaving the editor, but never edited here — a `PUT`
  // from this form would silently overwrite a toggle flipped in the list.
  const [sku, setSku] = useState(null);
  const [visibleEnCatalogo, setVisibleEnCatalogo] = useState(true);
  const [destacado, setDestacado] = useState(false);
  const [orden, setOrden] = useState(null);

  useEffect(() => {
    if (!esEdicion) return;

    let activo = true;
    setCargando(true);

    getProductById(id, { admin: true })
      .then((producto) => {
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
        setStock(String(producto.stock ?? 0));
        setFraseComercial(producto.fraseComercial ?? "");
        setPorQueLoVasAQuerer(producto.porQueLoVasAQuerer ?? "");
        setTePasaEsto(producto.tePasaEsto ?? "");
        setBeneficios(producto.beneficios ?? []);
        setUsos(producto.usos ?? []);
        setIdealPara(producto.idealPara ?? []);
        setIncluye(producto.incluye ?? []);
        setEspecificaciones(producto.especificaciones ?? []);
        setCaracteristicas(producto.caracteristicas ?? []);
        setFotos(producto.fotos ?? []);
        setVideo(producto.video ?? null);
        setSku(producto.sku ?? null);
        setVisibleEnCatalogo(producto.visibleEnCatalogo ?? true);
        setDestacado(producto.destacado ?? false);
        setOrden(producto.orden ?? null);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y la pantalla en blanco. Preferimos un error visible sobre un spinner
      // eterno: el admin necesita saber que el problema es la conexión.
      .catch(() => {
        if (!activo) return;
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id, esEdicion]);

  // Cerrar la pestaña o recargar esquiva a React Router por completo — el
  // único gancho posible ahí es `beforeunload`.
  useEffect(() => {
    if (!sucio) return;

    function avisar(event) {
      event.preventDefault();
      // Requerido por navegadores viejos; los actuales ignoran el texto y
      // muestran su propio diálogo.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  // Los <Link> de react-router navegan sin recargar, así que esquivan tanto
  // `beforeunload` como el botón Cancelar: tocar "Órdenes" en el sidebar
  // descartaba todo en silencio. La app usa `BrowserRouter`, no un data
  // router, así que `useBlocker` no está disponible; migrar todo el ruteo
  // por esto sería desproporcionado. Se intercepta el click en fase de
  // captura, antes de que react-router lo procese.
  useEffect(() => {
    if (!sucio) return;

    function interceptar(event) {
      // Solo click izquierdo sin modificadores: ctrl/cmd/shift abren en otra
      // pestaña y no descartan nada de esta.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const enlace = event.target.closest?.("a[href]");
      if (!enlace) return;
      // Un enlace a otra pestaña del navegador no descarta este formulario.
      if (enlace.target && enlace.target !== "_self") return;
      // Anclas internas de la misma página tampoco navegan a ningún lado.
      if (enlace.getAttribute("href")?.startsWith("#")) return;

      if (confirmarSalida()) return;

      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("click", interceptar, true);
    return () => document.removeEventListener("click", interceptar, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucio]);

  useEffect(() => {
    let activo = true;
    getCategorias()
      .then((data) => {
        if (activo) setCategorias(data);
      })
      // Falla blanda, mismo criterio que `Coleccion.jsx`: el desplegable queda
      // sin opciones pero el resto del formulario sigue siendo usable, así que
      // se avisa aparte en vez de bloquear la carga entera.
      .catch(() => {
        if (activo) setErrorCategorias("No se pudieron cargar las categorías.");
      });
    return () => {
      activo = false;
    };
  }, []);

  /**
   * Wraps a state setter so any edit also flags the form dirty. With a preview
   * this convincing, an admin can easily believe a change is already saved —
   * the header badge is the counterweight.
   */
  function editar(setter) {
    return (valor) => {
      setSucio(true);
      setter(valor);
    };
  }

  /**
   * The shape `FichaProducto` expects, built from form state. Photos already
   * carry a usable `url` (persisted ones from the API, freshly picked ones
   * from `URL.createObjectURL` inside MediaUploader), so the preview shows
   * not-yet-uploaded images with no extra work.
   */
  const productoPreview = useMemo(
    () => ({
      id: productoId,
      nombre,
      descripcion,
      precio,
      etiqueta: etiqueta.trim() === "" ? null : etiqueta.trim(),
      stock: stock === "" ? 0 : Number(stock),
      fraseComercial: fraseComercial.trim() === "" ? null : fraseComercial.trim(),
      porQueLoVasAQuerer: porQueLoVasAQuerer.trim() === "" ? null : porQueLoVasAQuerer.trim(),
      tePasaEsto: tePasaEsto.trim() === "" ? null : tePasaEsto.trim(),
      beneficios,
      usos,
      idealPara,
      incluye,
      especificaciones,
      caracteristicas,
      fotos,
      video,
      relacionados: [],
    }),
    [
      productoId,
      nombre,
      descripcion,
      precio,
      etiqueta,
      stock,
      fraseComercial,
      porQueLoVasAQuerer,
      tePasaEsto,
      beneficios,
      usos,
      idealPara,
      incluye,
      especificaciones,
      caracteristicas,
      fotos,
      video,
    ],
  );

  function agregarCaracteristica() {
    const texto = nuevaCaracteristica.trim();
    if (!texto) return;
    setSucio(true);
    setCaracteristicas((prev) => [...prev, { id: `tmp-${Date.now()}`, texto }]);
    setNuevaCaracteristica("");
  }

  function eliminarCaracteristica(index) {
    setSucio(true);
    setCaracteristicas((prev) => prev.filter((_, i) => i !== index));
  }

  function agregarEspecificacion() {
    const nombreSpec = nuevaSpecNombre.trim();
    const valorSpec = nuevaSpecValor.trim();
    if (!nombreSpec || !valorSpec) return;
    setSucio(true);
    setEspecificaciones((prev) => [...prev, { id: `tmp-${Date.now()}`, nombre: nombreSpec, valor: valorSpec }]);
    setNuevaSpecNombre("");
    setNuevaSpecValor("");
  }

  function eliminarEspecificacion(index) {
    setSucio(true);
    setEspecificaciones((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * `MediaUploader` owns the per-photo remove button and reports the next
   * `fotos` array via `onChangeFotos`. This wrapper diffs against the current
   * state: if a removed photo was already persisted (numeric id from the
   * store), it's deleted via `deletePhoto` immediately so `orden` stays
   * re-normalized server-side. Freshly added, not-yet-saved photos
   * (client-generated preview, no numeric id) are only dropped from local
   * state.
   */
  async function handleChangeFotos(siguientesFotos) {
    setSucio(true);
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

  /**
   * Puerta única para toda salida del editor. El badge "Cambios sin guardar"
   * promete que lo cargado importa; irse en silencio rompería esa promesa
   * justo después de veinte minutos de carga.
   */
  function confirmarSalida() {
    if (!sucio) return true;
    return window.confirm("Tenés cambios sin guardar. Si salís ahora se pierden. ¿Salir igual?");
  }

  function salirDelEditor() {
    if (!confirmarSalida()) return;
    navigate("/catalogo/admin/productos");
  }

  /**
   * En pantallas chicas las dos columnas son pestañas y la del formulario se
   * oculta con `display:none`. La validación nativa no puede enfocar un campo
   * requerido invisible, así que el navegador cancela el submit sin mensaje
   * alguno — apretabas Guardar y no pasaba nada. Acá se vuelve a la pestaña
   * Editar y recién entonces se pide el submit, ya con el campo visible.
   */
  function handleClickGuardar(event) {
    if (panelActivo === "form") return;

    event.preventDefault();
    setPanelActivo("form");
    requestAnimationFrame(() => formRef.current?.requestSubmit());
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
      stock,
      fraseComercial: fraseComercial.trim() === "" ? null : fraseComercial.trim(),
      porQueLoVasAQuerer: porQueLoVasAQuerer.trim() === "" ? null : porQueLoVasAQuerer.trim(),
      tePasaEsto: tePasaEsto.trim() === "" ? null : tePasaEsto.trim(),
      beneficios: beneficios.map((b) => ({ texto: b.texto })),
      usos: usos.map((u) => ({ texto: u.texto })),
      idealPara: idealPara.map((i) => ({ texto: i.texto })),
      incluye: incluye.map((i) => ({ texto: i.texto })),
      especificaciones: especificaciones.map((e) => ({ nombre: e.nombre, valor: e.valor })),
      caracteristicas: caracteristicas.map((c) => ({ texto: c.texto })),
      // Persisted photos (numeric id, no local `file`) are referenced by id
      // so the backend keeps them as-is; freshly picked photos (`f.file`
      // set by MediaUploader) are sent as real bytes for a new upload.
      fotosExistentes: fotos.filter((f) => typeof f.id === "number" && !f.file).map((f) => f.id),
      fotosNuevas: fotos.filter((f) => f.file).map((f) => f.file),
      // La secuencia final, en el orden real del array. `fotosExistentes` sola
      // no alcanza: dice qué fotos sobreviven, no en qué posición, y el backend
      // dejaría las nuevas al final. La posición 0 es la portada y la 1 es la
      // imagen de "¿Qué problema resuelve?", así que el orden es contenido.
      ordenFotos: fotos.reduce((acc, f) => {
        if (f.file) {
          // El índice tiene que coincidir con la posición en `fotosNuevas`,
          // que se arma con el mismo filtro y conserva este mismo orden.
          acc.push({ tipo: "nueva", index: acc.filter((t) => t.tipo === "nueva").length });
        } else {
          acc.push({ tipo: "existente", id: f.id });
        }
        return acc;
      }, []),
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
      setSucio(false);
      navigate("/catalogo/admin/productos");
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

  // Distinto de `noEncontrado`: el producto puede existir perfectamente, lo que
  // falló es la conexión. Mostrar el form vacío haría creer que el producto se
  // quedó sin datos, y guardarlo los borraría de verdad.
  if (esEdicion && errorCarga) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant">cloud_off</span>
        <p className="font-headline-md text-headline-md text-on-surface">No se pudo cargar el producto</p>
        <p className="font-body-md text-body-md max-w-md text-on-surface-variant">{errorCarga}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Reintentar
        </button>
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
    // En `lg` el editor ocupa el alto del viewport (menos la bottom nav, el
    // `md:pb-20` de AdminLayout) y cada columna scrollea sola. No se puede usar
    // `position: sticky` acá: el `<main>` del layout lleva `overflow-x-auto`
    // por las tablas anchas del admin, lo que lo convierte en el scrollport del
    // sticky — pero quien scrollea es la ventana, así que el sticky nunca se
    // activaba y el preview se perdía de vista al bajar por el formulario.
    <div className="flex w-full flex-col lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant bg-surface px-4 py-4 md:px-8 lg:static">
        <div className="min-w-0">
          <div className="mb-2">
            <BotonVolver fallback="/catalogo/admin/productos" puedeSalir={confirmarSalida} />
          </div>
          <span className="font-label-sm text-label-sm block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-md text-headline-md text-primary">
            {esEdicion ? "Editar producto" : "Agregar producto"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {sucio ? (
            <span className="font-body-md text-body-md inline-flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              Cambios sin guardar
            </span>
          ) : null}
          <button
            type="button"
            onClick={salirDelEditor}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-producto"
            onClick={handleClickGuardar}
            disabled={guardando}
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
          >
            {guardando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </header>

      {/* Tabs: only below `lg`, where the two panes can't sit side by side. */}
      <div className="sticky top-0 z-10 flex border-b border-outline-variant bg-surface px-4 lg:hidden" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={panelActivo === "form"}
          onClick={() => setPanelActivo("form")}
          className={`font-label-md text-label-md flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 uppercase tracking-widest ${
            panelActivo === "form"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Editar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panelActivo === "preview"}
          onClick={() => setPanelActivo("preview")}
          className={`font-label-md text-label-md flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 uppercase tracking-widest ${
            panelActivo === "preview"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          Vista previa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        {/* ---------------- Columna izquierda: formulario ---------------- */}
        <div
          className={`px-4 py-6 md:px-8 ${
            panelActivo === "form" ? "" : "hidden"
          } lg:block lg:h-full lg:overflow-y-auto`}
        >
          <form
            id="form-producto"
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex max-w-2xl flex-col gap-8"
          >
            <div>
              <label htmlFor="nombre" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => editar(setNombre)(e.target.value)}
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
                required
                value={descripcion}
                onChange={(e) => editar(setDescripcion)(e.target.value)}
                className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                      setSucio(true);
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
                  onChange={(e) => editar(setEtiqueta)(e.target.value)}
                  className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                />
                <datalist id="sugerencias-etiqueta">
                  {SUGERENCIAS_ETIQUETA.map((sugerencia) => (
                    <option key={sugerencia} value={sugerencia} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
              <h2 className="font-headline-md text-headline-md text-primary">Contenido comercial</h2>

              <div>
                <label
                  htmlFor="fraseComercial"
                  className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
                >
                  Frase comercial (opcional)
                </label>
                <input
                  id="fraseComercial"
                  type="text"
                  value={fraseComercial}
                  onChange={(e) => editar(setFraseComercial)(e.target.value)}
                  placeholder="Ej: Iluminá donde quieras, sin depender de un enchufe."
                  className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="porQueLoVasAQuerer"
                  className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
                >
                  ¿Por qué lo vas a querer? (opcional)
                </label>
                <textarea
                  id="porQueLoVasAQuerer"
                  rows={3}
                  value={porQueLoVasAQuerer}
                  onChange={(e) => editar(setPorQueLoVasAQuerer)(e.target.value)}
                  className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="tePasaEsto"
                  className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
                >
                  ¿Te pasa esto? (opcional)
                </label>
                <textarea
                  id="tePasaEsto"
                  rows={3}
                  value={tePasaEsto}
                  onChange={(e) => editar(setTePasaEsto)(e.target.value)}
                  className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
                  Beneficios
                </h3>
                <ListaDinamica items={beneficios} onChange={editar(setBeneficios)} placeholder="Ej: Recargable por USB" />
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
              <h2 className="font-headline-md text-headline-md text-primary">Uso del producto</h2>

              <div>
                <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
                  ¿Cómo podés usarlo? (opcional)
                </h3>
                <ListaDinamica items={usos} onChange={editar(setUsos)} placeholder="Ej: Para estudiar" />
              </div>

              <div>
                <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
                  Ideal para (opcional)
                </h3>
                <ListaDinamica items={idealPara} onChange={editar(setIdealPara)} placeholder="Ej: Estudiantes" />
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
              <h2 className="font-headline-md text-headline-md text-primary">Información del producto</h2>

              <div>
                <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
                  Características destacadas
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
                  Especificaciones técnicas (opcional)
                </h3>
                <div className="mb-3 flex flex-col gap-2">
                  {especificaciones.map((spec, index) => (
                    <div
                      key={spec.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-surface-container px-4 py-2"
                    >
                      <span className="font-body-md text-body-md text-on-surface">
                        <strong>{spec.nombre}</strong> — {spec.valor}
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminarEspecificacion(index)}
                        aria-label={`Eliminar especificación ${spec.nombre}`}
                        className="text-on-surface-variant hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={nuevaSpecNombre}
                    onChange={(e) => setNuevaSpecNombre(e.target.value)}
                    placeholder="Nombre (ej: Material)"
                    className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={nuevaSpecValor}
                    onChange={(e) => setNuevaSpecValor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarEspecificacion();
                      }
                    }}
                    placeholder="Valor (ej: ABS)"
                    className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={agregarEspecificacion}
                    className="font-label-md text-label-md shrink-0 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
                  >
                    + Agregar especificación
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
                  ¿Qué incluye? (opcional)
                </h3>
                <ListaDinamica items={incluye} onChange={editar(setIncluye)} placeholder="Ej: 1 × Cable USB" />
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
              <h2 className="font-headline-md text-headline-md text-primary">Multimedia</h2>
              <MediaUploader
                fotos={fotos}
                video={video}
                onChangeFotos={handleChangeFotos}
                onChangeVideo={editar(setVideo)}
              />
            </div>

            {/* ---------- Lo que no se ve en la ficha pública ---------- */}
            <div
              data-testid="config-catalogo"
              className="flex flex-col gap-6 border-t border-outline-variant pt-8"
            >
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Configuración del catálogo</h2>
                <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
                  Nada de esto se muestra en la ficha pública. Controla dónde y cómo aparece el producto.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="categoria" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
                    Categoría (opcional)
                  </label>
                  <select
                    id="categoria"
                    value={categoriaId}
                    onChange={(e) => editar(setCategoriaId)(e.target.value)}
                    className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                  {errorCategorias ? (
                    <p className="font-body-md mt-2 text-[13px] leading-snug text-error">
                      {errorCategorias} Podés guardar igual y asignarla después.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="stock" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
                    Stock
                  </label>
                  <input
                    id="stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={stock}
                    onChange={(e) => editar(setStock)(e.target.value)}
                    className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  />
                  <p className="font-body-md mt-2 text-[13px] leading-snug text-on-surface-variant">
                    En 0 el producto sale de la grilla pública, pero su ficha sigue accesible con el badge
                    “Agotado”.
                  </p>
                </div>
              </div>

              {esEdicion ? (
                <div className="rounded-lg border border-outline-variant">
                  <div className="flex flex-col gap-1 border-b border-outline-variant px-4 py-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                      SKU
                    </span>
                    <span className="font-body-md text-body-md text-on-surface">{sku ?? "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
                    <span className="font-body-md text-body-md text-on-surface">Visible en el catálogo</span>
                    <span
                      className={`font-label-sm text-label-sm rounded-full px-3 py-1 uppercase tracking-wide ${
                        visibleEnCatalogo
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      {visibleEnCatalogo ? "Sí" : "No"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
                    <span className="font-body-md text-body-md text-on-surface">Destacado</span>
                    <span
                      className={`font-label-sm text-label-sm rounded-full px-3 py-1 uppercase tracking-wide ${
                        destacado
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      {destacado ? "Sí" : "No"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
                    <span className="font-body-md text-body-md text-on-surface">Orden de merchandising</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{orden ?? "—"}</span>
                  </div>

                  <p className="font-body-md px-4 py-3 text-[13px] leading-snug text-on-surface-variant">
                    Estos tres se cambian desde el{" "}
                    <Link to="/catalogo/admin/productos" className="text-primary underline">
                      listado de productos
                    </Link>
                    , donde se guardan al instante.
                  </p>
                </div>
              ) : (
                <p className="font-body-md rounded-lg border border-outline-variant px-4 py-3 text-[13px] leading-snug text-on-surface-variant">
                  El SKU se genera solo al guardar. La visibilidad, el destacado y el orden se ajustan después
                  desde el{" "}
                  <Link to="/catalogo/admin/productos" className="text-primary underline">
                    listado de productos
                  </Link>
                  .
                </p>
              )}
            </div>

            {error ? (
              <p className="font-body-md text-body-md rounded-lg bg-error-container px-4 py-3 text-on-error-container">
                {error}
              </p>
            ) : null}
          </form>
        </div>

        {/* ---------------- Columna derecha: vista previa ---------------- */}
        <div
          className={`border-outline-variant bg-surface-container-low lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:border-l ${
            panelActivo === "preview" ? "" : "hidden"
          }`}
        >
          <div className="flex flex-col lg:min-h-0 lg:flex-1">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3 lg:static">
              <span className="font-label-sm text-label-sm inline-flex items-center gap-2 uppercase tracking-widest text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  {plantillaCompleta ? "dashboard_customize" : "visibility"}
                </span>
                {plantillaCompleta ? "Plantilla completa" : "Así lo ve el cliente"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlantillaCompleta((valor) => !valor)}
                  className="font-label-sm text-label-sm inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 uppercase tracking-widest text-on-surface-variant hover:border-outline"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {plantillaCompleta ? "visibility" : "dashboard_customize"}
                  </span>
                  {plantillaCompleta ? "Ver como cliente" : "Ver plantilla"}
                </button>

              <div className="flex gap-1 rounded-lg bg-surface-container-highest p-1">
                <button
                  type="button"
                  aria-label="Vista escritorio"
                  aria-pressed={anchoPreview === "desktop"}
                  onClick={() => setAnchoPreview("desktop")}
                  className={`flex items-center rounded-md px-2 py-1 ${
                    anchoPreview === "desktop"
                      ? "bg-surface-container-lowest text-primary"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">desktop_windows</span>
                </button>
                <button
                  type="button"
                  aria-label="Vista móvil"
                  aria-pressed={anchoPreview === "mobile"}
                  onClick={() => setAnchoPreview("mobile")}
                  className={`flex items-center rounded-md px-2 py-1 ${
                    anchoPreview === "mobile"
                      ? "bg-surface-container-lowest text-primary"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">smartphone</span>
                </button>
                </div>
              </div>
            </div>

            {plantillaCompleta ? (
              <p className="font-body-md border-b border-outline-variant px-4 py-2 text-[13px] leading-snug text-on-surface-variant">
                Los bloques punteados están vacíos y no se publican.
              </p>
            ) : null}

            {/* `items-start` para que la ficha no se estire al alto del panel:
                debe medir lo que mide su contenido y scrollear dentro. */}
            <div className="flex items-start justify-center p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <div
                data-testid="preview-ficha"
                className={`w-full rounded-xl border border-outline-variant bg-background p-5 shadow-ambient ${
                  anchoPreview === "mobile" ? "max-w-[390px]" : ""
                }`}
              >
                {/* Siempre compacto: el panel del preview es media pantalla,
                    más angosto que el `lg` que asumen los breakpoints de
                    viewport de la ficha. */}
                <FichaProducto
                  producto={productoPreview}
                  modoPreview
                  compacto
                  plantillaCompleta={plantillaCompleta}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProductoForm;
