import { useState } from "react";
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
  const [copiado, setCopiado] = useState(false);

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

    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-label-md text-label-md inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface"
    >
      <span className="material-symbols-outlined text-[18px]">share</span>
      {copiado ? "Link copiado" : "Compartir"}
    </button>
  );
}

export default BotonCompartir;
