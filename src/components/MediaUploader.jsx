import { useEffect, useRef, useState } from "react";

const MAX_FOTOS = 10;
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_VIDEO = ["video/mp4", "video/webm"];

/**
 * Admin create/edit media picker.
 *
 * The photo list is a single ordered array, but three of its positions do
 * very different jobs on the public side, so each gets its own input instead
 * of hiding the distinction behind reorder arrows:
 *
 *   - position 0 -> catalog cover (grid card, hero of the detail page, OG image)
 *   - position 1 -> the image beside "¿Qué problema resuelve?"
 *   - positions 2+ -> the rest of the gallery
 *
 * `orden` has no gaps (it's a compact 0..n sequence), so a later slot can't be
 * filled while an earlier one is empty — the inputs stay disabled until the
 * ones before them have a photo. Removing a photo shifts the rest up, and
 * because each slot renders its own preview the promotion is visible
 * immediately rather than silent.
 *
 * Per design D6: file inputs produce `URL.createObjectURL(file)` previews held
 * in local state — never persisted as base64. Object URLs are revoked on
 * unmount. Hard caps mirror the backend's own validation so the user gets an
 * immediate rejection instead of discovering it on submit.
 *
 * `fotos`/`video` are controlled by the parent form: `{ url, file }[]` for
 * fotos, `{ url, file } | null` for video.
 */
function MediaUploader({ fotos = [], video = null, onChangeFotos, onChangeVideo }) {
  const [error, setError] = useState(null);
  const objectUrlsRef = useRef(new Set());

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function crearPreviewUrl(file) {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }

  function revocarPreviewUrl(url) {
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }

  const portada = fotos[0] ?? null;
  const imagenProblema = fotos[1] ?? null;
  const galeria = fotos.slice(2);
  const lleno = fotos.length >= MAX_FOTOS;

  /** Valida el tipo y devuelve los archivos aceptados, o `null` si hay alguno inválido. */
  function validarTipos(archivos) {
    if (archivos.some((file) => !TIPOS_FOTO.includes(file.type))) {
      setError("Formato de foto no admitido. Use JPG, PNG o WEBP.");
      return null;
    }
    setError(null);
    return archivos;
  }

  /** Coloca una única foto en `indice`, reemplazando la que hubiera. */
  function ponerEn(indice, event) {
    const archivos = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (archivos.length === 0) return;

    const aceptados = validarTipos(archivos.slice(0, 1));
    if (!aceptados) return;

    const anterior = fotos[indice];
    if (anterior?.url) revocarPreviewUrl(anterior.url);

    const nueva = { file: aceptados[0], url: crearPreviewUrl(aceptados[0]) };
    const siguientes = [...fotos];
    siguientes[indice] = nueva;
    onChangeFotos?.(siguientes);
  }

  function agregarAGaleria(event) {
    const archivos = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (archivos.length === 0) return;

    const aceptadosTipo = validarTipos(archivos);
    if (!aceptadosTipo) return;

    const espacioDisponible = MAX_FOTOS - fotos.length;
    if (espacioDisponible <= 0) {
      setError(`Un producto admite un máximo de ${MAX_FOTOS} fotos.`);
      return;
    }
    if (aceptadosTipo.length > espacioDisponible) {
      setError(
        `Un producto admite un máximo de ${MAX_FOTOS} fotos. Se agregaron ${espacioDisponible} de ${aceptadosTipo.length} seleccionadas.`,
      );
    }

    const nuevas = aceptadosTipo
      .slice(0, espacioDisponible)
      .map((file) => ({ file, url: crearPreviewUrl(file) }));
    onChangeFotos?.([...fotos, ...nuevas]);
  }

  /**
   * Quitar una foto corre las siguientes una posición hacia arriba. Es la
   * única semántica posible: `orden` no admite huecos. Cada zona muestra su
   * propia preview, así que el ascenso se ve al instante.
   */
  function quitarEn(indice) {
    const foto = fotos[indice];
    if (foto?.url) revocarPreviewUrl(foto.url);
    onChangeFotos?.(fotos.filter((_, i) => i !== indice));
    setError(null);
  }

  /** Reordena dentro de la galería; nunca toca las posiciones 0 y 1. */
  function moverEnGaleria(indiceGaleria, direccion) {
    const destino = indiceGaleria + direccion;
    if (destino < 0 || destino >= galeria.length) return;

    const siguientes = [...fotos];
    const a = 2 + indiceGaleria;
    const b = 2 + destino;
    [siguientes[a], siguientes[b]] = [siguientes[b], siguientes[a]];
    onChangeFotos?.(siguientes);
  }

  function handleVideoChange(event) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    setError(null);

    if (!TIPOS_VIDEO.includes(archivo.type)) {
      setError("Formato de video no admitido. Use MP4 o WEBM.");
      return;
    }

    if (video?.url) revocarPreviewUrl(video.url);
    onChangeVideo?.({ file: archivo, url: crearPreviewUrl(archivo) });
  }

  function eliminarVideo() {
    if (video?.url) revocarPreviewUrl(video.url);
    onChangeVideo?.(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* `subgrid`: las cuatro filas (título, ayuda, imagen, botón) se alinean
          entre las dos columnas aunque un título ocupe dos líneas y el otro
          una. Sin esto la imagen y el botón de la derecha quedan corridos
          hacia abajo. Nada de alturas fijas: el texto puede crecer. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto_auto] sm:gap-y-2">
        <RanuraFoto
          titulo="Foto de portada"
          ayuda="Es la que se ve en la grilla del catálogo, arriba de la ficha y al compartir el link."
          foto={portada}
          alt="Foto de portada"
          etiquetaSubir="Subir foto de portada"
          etiquetaReemplazar="Reemplazar foto de portada"
          etiquetaQuitar="Quitar foto de portada"
          onSeleccionar={(e) => ponerEn(0, e)}
          onQuitar={() => quitarEn(0)}
        />

        <RanuraFoto
          titulo="Imagen de ¿Qué problema resuelve?"
          ayuda="Acompaña esa sección de la ficha. Si no la cargás, esa sección va sin imagen."
          foto={imagenProblema}
          alt="Imagen de ¿Qué problema resuelve?"
          etiquetaSubir="Subir imagen para ¿Qué problema resuelve?"
          etiquetaReemplazar="Reemplazar imagen de ¿Qué problema resuelve?"
          etiquetaQuitar="Quitar imagen de ¿Qué problema resuelve?"
          deshabilitado={!portada}
          motivoDeshabilitado="Primero cargá la foto de portada."
          onSeleccionar={(e) => ponerEn(1, e)}
          onQuitar={() => quitarEn(1)}
        />
      </div>

      <div>
        <h3 className="font-label-md text-label-md mb-1 uppercase tracking-widest text-on-surface">
          Galería ({fotos.length}/{MAX_FOTOS} fotos en total)
        </h3>
        <p className="font-body-md mb-3 text-[13px] leading-snug text-on-surface-variant">
          El resto de las fotos del producto, en el orden en que se muestran en la ficha.
        </p>

        {galeria.length > 0 ? (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {galeria.map((foto, index) => (
              <div
                key={foto.url}
                className="relative aspect-square overflow-hidden rounded-lg bg-surface-container"
              >
                <img
                  src={foto.url}
                  alt={`Foto ${index + 3} de la galería`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => quitarEn(index + 2)}
                  aria-label={`Quitar foto ${index + 3} de la galería`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <div className="absolute bottom-1 right-1 flex gap-1">
                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={() => moverEnGaleria(index, -1)}
                      aria-label={`Mover foto ${index + 3} de la galería hacia atrás`}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                  ) : null}
                  {index < galeria.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => moverEnGaleria(index, 1)}
                      aria-label={`Mover foto ${index + 3} de la galería hacia adelante`}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <label
          className={`inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-body-md text-body-md ${
            !imagenProblema || lleno
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer text-on-surface-variant hover:border-outline"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
          Agregar fotos
          <input
            type="file"
            aria-label="Agregar fotos a la galería"
            accept={TIPOS_FOTO.join(",")}
            multiple
            disabled={!imagenProblema || lleno}
            onChange={agregarAGaleria}
            className="hidden"
          />
        </label>
        {!imagenProblema ? (
          <p className="font-body-md mt-2 text-[13px] leading-snug text-on-surface-variant">
            Primero cargá la portada y la imagen de “¿Qué problema resuelve?”.
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="font-label-md text-label-md mb-3 uppercase tracking-widest text-on-surface">
          Video (opcional)
        </h3>
        {video ? (
          <div className="relative mb-3 w-full max-w-xs overflow-hidden rounded-lg bg-surface-container">
            <video src={video.url} controls className="w-full" />
            <button
              type="button"
              onClick={eliminarVideo}
              aria-label="Eliminar video"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-body-md text-body-md text-on-surface-variant hover:border-outline">
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Agregar video
            <input
              type="file"
              aria-label="Agregar video"
              accept={TIPOS_VIDEO.join(",")}
              onChange={handleVideoChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error ? (
        <p className="font-body-md text-body-md rounded-lg bg-error-container px-4 py-2 text-sm text-on-error-container">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Una de las dos posiciones con significado propio (portada / imagen del problema). */
function RanuraFoto({
  titulo,
  ayuda,
  foto,
  alt,
  etiquetaSubir,
  etiquetaReemplazar,
  etiquetaQuitar,
  deshabilitado = false,
  motivoDeshabilitado,
  onSeleccionar,
  onQuitar,
}) {
  return (
    // Cada hijo directo es una fila del subgrid del padre, por eso el bloque de
    // acción agrupa botón y motivo: tienen que ocupar una sola fila.
    <div className="grid gap-y-2 sm:row-span-4 sm:grid-rows-subgrid">
      <h3 className="font-label-md text-label-md self-end uppercase tracking-widest text-on-surface">
        {titulo}
      </h3>
      <p className="font-body-md text-[13px] leading-snug text-on-surface-variant">{ayuda}</p>

      {foto ? (
        <div className="relative aspect-square w-full max-w-[220px] self-start overflow-hidden rounded-lg bg-surface-container">
          <img src={foto.url} alt={alt} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onQuitar}
            aria-label={etiquetaQuitar}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ) : (
        <div className="flex aspect-square w-full max-w-[220px] self-start items-center justify-center rounded-lg border border-dashed border-outline-variant text-outline">
          <span className="material-symbols-outlined text-[28px]">image</span>
        </div>
      )}

      <div className="self-start">
        <label
          className={`inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-body-md text-body-md ${
            deshabilitado
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer text-on-surface-variant hover:border-outline"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
          {foto ? "Reemplazar" : "Subir"}
          <input
            type="file"
            aria-label={foto ? etiquetaReemplazar : etiquetaSubir}
            accept={TIPOS_FOTO.join(",")}
            disabled={deshabilitado}
            onChange={onSeleccionar}
            className="hidden"
          />
        </label>

        {deshabilitado && motivoDeshabilitado ? (
          <p className="font-body-md mt-2 text-[13px] leading-snug text-on-surface-variant">
            {motivoDeshabilitado}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default MediaUploader;
