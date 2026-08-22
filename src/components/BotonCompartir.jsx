import { useEffect, useRef, useState } from "react";
import { registrarCompartido } from "../api/products.js";

/**
 * Share button — Web Share API on capable browsers (opens the native OS
 * share sheet: WhatsApp, Instagram, etc.), falls back to copying the link
 * to the clipboard on desktop browsers without it.
 *
 * URL is read from window.location.href at click time (not passed as a
 * prop) so it always reflects the actual current tab URL.
 */
function BotonCompartir({ producto }) {
  // null | "copiado" | "error" — el rótulo temporal del botón tras intentar
  // copiar al portapapeles.
  const [estado, setEstado] = useState(null);

  // El timer de feedback se guarda para limpiarlo al desmontar: en React 18
  // un setState tras el unmount es un no-op silencioso, pero el timer queda
  // vivo igual.
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  function mostrarFeedback(nuevoEstado) {
    setEstado(nuevoEstado);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setEstado(null), 2500);
  }

  async function handleClick() {
    // Fire-and-forget (design decision): counted the moment the button is
    // tapped, not on confirmed share-sheet completion — navigator.share()'s
    // promise resolution isn't a reliable "the user actually sent it" signal
    // across browsers. Never blocks or surfaces an error to the user; the
    // share action itself already succeeded from their perspective either way.
    registrarCompartido(producto.id);

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: producto.nombre, url });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error al compartir:", err);
        }
      }
      return;
    }

    // `navigator.clipboard` puede ser undefined (contexto no seguro, o sea
    // HTTP) y `writeText` puede rechazar (permiso denegado): las dos ramas
    // caían antes en una unhandled rejection sin ningún feedback. El catch
    // convierte ambas en un mensaje visible.
    try {
      await navigator.clipboard.writeText(url);
      mostrarFeedback("copiado");
    } catch {
      mostrarFeedback("error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-label-md text-label-md inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface"
    >
      <span className="material-symbols-outlined text-[18px]">share</span>
      {estado === "copiado"
        ? "Link copiado"
        : estado === "error"
          ? "No se pudo copiar el link"
          : "Compartir"}
    </button>
  );
}

export default BotonCompartir;
