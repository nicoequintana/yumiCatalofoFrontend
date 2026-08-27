import { useState } from "react";
import { generarImagenes } from "../../../api/products.js";
import Spinner from "../../Spinner.jsx";

/**
 * Espejo del tope del backend (`MAX_REFERENCIAS` en `services/n8n.service.js`).
 * Sincronización manual entre repos, mismo criterio que `botDetector.js` ↔
 * `nginx.conf`. Acá solo evita un viaje que el servidor rechazaría igual.
 */
const MAX_REFERENCIAS = 2;

/**
 * Dispara el flujo de n8n que genera las imágenes del producto.
 *
 * Vive FUERA del `<form>` del editor a propósito: es una acción externa que no
 * tiene nada que ver con guardar el producto, y un botón adentro del form
 * invita a confundirla con Guardar.
 *
 * Las referencias que se eligen acá NO se guardan como fotos del producto:
 * viajan a n8n y se descartan. Por eso el input no comparte nada con
 * `MediaUploader`.
 *
 * Solo aparece en productos ya guardados: en un alta nueva no hay id ni datos
 * firmes que enviar.
 *
 * Los tres desenlaces se muestran distinto a propósito — ver el bloque de
 * avisos al final del render.
 */
function SeccionGenerarImagenes({ productoId }) {
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  // `null` = todavía no se envió. Si no, el resultado que devolvió n8n.
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  // Flag propio y no `error !== ""`: si el botón se deshabilitara por "hay un
  // error", un fallo del webhook dejaría al admin sin poder reintentar. Solo
  // una selección inválida bloquea el envío.
  const [excedido, setExcedido] = useState(false);

  if (!productoId) return null;

  function handleChange(event) {
    const elegidos = Array.from(event.target.files ?? []);
    setResultado(null);
    if (elegidos.length > MAX_REFERENCIAS) {
      setArchivos([]);
      setExcedido(true);
      setError(`Podés enviar hasta ${MAX_REFERENCIAS} imágenes de referencia.`);
      return;
    }
    setExcedido(false);
    setError("");
    setArchivos(elegidos);
  }

  async function handleEnviar() {
    setEnviando(true);
    setError("");
    setResultado(null);
    try {
      setResultado(await generarImagenes(productoId, archivos));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-outline-variant bg-surface-container-low p-6">
      <h2 className="font-headline-md text-headline-md mb-2 text-on-surface">Generar imágenes</h2>
      <p className="font-body-md text-body-md mb-4 text-on-surface-variant">
        Manda los datos de este producto y hasta {MAX_REFERENCIAS} imágenes de referencia al flujo de
        n8n. Las referencias no se guardan como fotos del producto.
      </p>

      <label
        htmlFor="referencias-n8n"
        className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface-variant"
      >
        Imágenes de referencia (al menos 1)
      </label>
      <input
        id="referencias-n8n"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleChange}
        className="font-body-md text-body-md mb-4 block w-full text-on-surface"
      />

      {archivos.length > 0 ? (
        <ul className="mb-4 flex flex-wrap gap-3">
          {archivos.map((archivo) => (
            <li
              key={archivo.name}
              className="relative h-24 w-24 overflow-hidden rounded-lg bg-surface-container-high"
            >
              {/* `absolute inset-0` y no `h-full w-full` en flujo normal: un
                  <img> dentro de una caja con aspect ratio estira la caja al
                  ratio del archivo (ver CLAUDE.md, "Grid del catálogo"). */}
              <img
                src={URL.createObjectURL(archivo)}
                alt={archivo.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={handleEnviar}
        // Sin referencias el pedido no puede prosperar: el flujo usa
        // gpt-image-1 en modo `edit`, que necesita imagen de entrada.
        disabled={enviando || excedido || archivos.length === 0}
        className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 uppercase tracking-widest text-on-primary hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
        {enviando ? "Enviando…" : "Generar imágenes"}
      </button>

      {/* Dos mensajes distintos, y la diferencia importa: `already_processed`
          significa que n8n NO generó nada porque la carpeta ya existía. Con un
          único "enviado", el admin se quedaría esperando imágenes que nunca van
          a llegar. */}
      {resultado?.estado === "processing" ? (
        <p role="status" className="font-body-md text-body-md mt-4 text-secondary">
          Pedido enviado. Las imágenes tardan unos minutos y te va a llegar un mail cuando estén.
        </p>
      ) : null}

      {resultado?.estado === "already_processed" ? (
        <p
          role="status"
          className="font-body-md text-body-md mt-4 rounded-lg bg-tertiary-container px-4 py-3 text-on-surface"
        >
          Este producto ya tiene imágenes generadas
          {resultado.carpeta ? ` en ${resultado.carpeta}` : ""}. No se generó nada nuevo. Para
          regenerarlas hay que borrar esa carpeta en Cloudinary primero.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="font-body-md text-body-md mt-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default SeccionGenerarImagenes;
