import { useEffect, useRef, useState } from "react";

const MAX_FOTOS = 10;
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_VIDEO = ["video/mp4", "video/webm"];

/**
 * Admin create/edit media picker.
 *
 * Per design D6: file inputs produce `URL.createObjectURL(file)` previews
 * held in local state — never persisted as base64 (would blow localStorage's
 * quota). Object URLs are revoked on unmount. Hard caps mirror the mock
 * API's own validation (`products.js` MAX_FOTOS = 4, 1 video max) so the
 * user gets an immediate client-side rejection message on the 5th photo
 * attempt instead of only discovering it on submit.
 *
 * `fotos`/`video` are controlled by the parent form (AdminProductoForm,
 * PR 4): `{ url, file }[]` for fotos, `{ url, file } | null` for video.
 * `onChangeFotos(fotos)` / `onChangeVideo(video)` report the new arrays.
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

  function handleFotosChange(event) {
    const archivos = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (archivos.length === 0) return;

    setError(null);

    const invalido = archivos.find((file) => !TIPOS_FOTO.includes(file.type));
    if (invalido) {
      setError("Formato de foto no admitido. Use JPG, PNG o WEBP.");
      return;
    }

    const espacioDisponible = MAX_FOTOS - fotos.length;
    if (espacioDisponible <= 0) {
      setError(`Un producto admite un máximo de ${MAX_FOTOS} fotos.`);
      return;
    }

    if (archivos.length > espacioDisponible) {
      setError(
        `Un producto admite un máximo de ${MAX_FOTOS} fotos. Se agregaron ${espacioDisponible} de ${archivos.length} seleccionadas.`,
      );
    }

    const aceptados = archivos.slice(0, espacioDisponible);
    const nuevasFotos = aceptados.map((file) => ({ file, url: crearPreviewUrl(file) }));
    onChangeFotos?.([...fotos, ...nuevasFotos]);
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

    if (video?.url) {
      revocarPreviewUrl(video.url);
    }

    onChangeVideo?.({ file: archivo, url: crearPreviewUrl(archivo) });
  }

  function eliminarFoto(index) {
    const foto = fotos[index];
    if (foto?.url) revocarPreviewUrl(foto.url);
    onChangeFotos?.(fotos.filter((_, i) => i !== index));
    setError(null);
  }

  function eliminarVideo() {
    if (video?.url) revocarPreviewUrl(video.url);
    onChangeVideo?.(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-label-md text-label-md mb-3 uppercase tracking-widest text-on-surface">
          Fotos ({fotos.length}/{MAX_FOTOS})
        </h3>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {fotos.map((foto, index) => (
            <div
              key={foto.url}
              className="relative aspect-square overflow-hidden rounded-lg bg-surface-container"
            >
              <img src={foto.url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => eliminarFoto(index)}
                aria-label={`Eliminar foto ${index + 1}`}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
        {fotos.length < MAX_FOTOS ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-body-md text-body-md text-on-surface-variant hover:border-outline">
            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
            Agregar foto
            <input
              type="file"
              accept={TIPOS_FOTO.join(",")}
              multiple
              onChange={handleFotosChange}
              className="hidden"
            />
          </label>
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
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-body-md text-body-md text-on-surface-variant hover:border-outline">
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Agregar video
            <input type="file" accept={TIPOS_VIDEO.join(",")} onChange={handleVideoChange} className="hidden" />
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

export default MediaUploader;
