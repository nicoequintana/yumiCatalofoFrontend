import { useEffect } from "react";
import useDialogo from "../hooks/useDialogo.js";

/**
 * Full-screen overlay for viewing a photo enlarged (design item 5).
 * Only ever shown for photo slides — PhotoGallery does not open this for
 * the video slide (the <video> element already has native controls).
 *
 * `slides` / `activo` / `onNavegar` are shared with PhotoGallery so both
 * stay in sync on the same current index.
 *
 * El foco, la trampa de tabulado y el cierre con Escape los maneja
 * `useDialogo`; acá quedan solo las flechas, que son propias de una galería y
 * no de un diálogo cualquiera.
 */
function Lightbox({ slides, activo, onNavegar, onCerrar, nombre }) {
  const dialogoRef = useDialogo({ onCerrar });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "ArrowRight") onNavegar((activo + 1) % slides.length);
      if (event.key === "ArrowLeft") onNavegar((activo - 1 + slides.length) % slides.length);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activo, slides.length, onNavegar]);

  const slideActivo = slides[activo];
  if (!slideActivo) return null;

  return (
    <div
      ref={dialogoRef}
      role="dialog"
      aria-modal="true"
      aria-label={nombre ? `Foto ampliada de ${nombre}` : "Foto ampliada"}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 outline-none"
      onClick={onCerrar}
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavegar((activo - 1 + slides.length) % slides.length);
            }}
            aria-label="Foto anterior"
            className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:left-8"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavegar((activo + 1) % slides.length);
            }}
            aria-label="Foto siguiente"
            className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-8"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      ) : null}

      <img
        src={slideActivo.url}
        alt={nombre}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />
    </div>
  );
}

export default Lightbox;
