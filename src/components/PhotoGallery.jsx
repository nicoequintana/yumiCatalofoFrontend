import { useState } from "react";
import Lightbox from "./Lightbox.jsx";

/**
 * Product detail image panel, ported from detalle-producto.html L149-167.
 *
 * Dot count == slide count (fotos + optional video, up to 10 fotos per
 * design item 2). Prev/next arrows are always visible (design item 5, not
 * hover-only, so mobile gets them without needing hover support). Clicking
 * a photo slide opens the Lightbox; clicking the video slide does nothing
 * extra since <video> already has native controls.
 */
function PhotoGallery({ fotos = [], video = null, nombre = "" }) {
  const [activo, setActivo] = useState(0);
  const [lightboxAbierto, setLightboxAbierto] = useState(false);

  const slides = [
    ...fotos.map((foto) => ({ tipo: "foto", ...foto })),
    ...(video ? [{ tipo: "video", ...video }] : []),
  ];

  const slideActivo = slides[activo];

  function irA(index) {
    setActivo(index);
  }

  function siguiente() {
    setActivo((prev) => (prev + 1) % slides.length);
  }

  function anterior() {
    setActivo((prev) => (prev - 1 + slides.length) % slides.length);
  }

  return (
    <div
      className="relative col-span-1 flex h-[500px] w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-container-lowest md:col-span-7 md:h-[700px]"
      style={{ boxShadow: "0px 10px 30px rgba(26, 26, 26, 0.03)" }}
    >
      <div className="absolute inset-0 z-0">
        <svg
          className="h-full w-full text-tertiary-container opacity-5"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path d="M0,0 L100,0 L100,100 C70,90 80,40 40,50 C10,55 0,100 0,100 Z" fill="currentColor" />
        </svg>
      </div>

      {slideActivo?.tipo === "video" ? (
        <video
          className="relative z-10 max-h-[80%] w-3/4 object-contain"
          src={slideActivo.url}
          controls
        />
      ) : slideActivo ? (
        <img
          key={slideActivo.id ?? activo}
          alt={nombre}
          onClick={() => setLightboxAbierto(true)}
          className="relative z-10 max-h-[80%] w-3/4 cursor-zoom-in object-contain transition-opacity duration-200 ease-in-out"
          src={slideActivo.url}
        />
      ) : null}

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={anterior}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={siguiente}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface hover:bg-surface"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      ) : null}

      {slides.length >= 1 ? (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 transform gap-2">
          {slides.map((slide, index) => (
            <button
              key={`${slide.tipo}-${slide.id ?? index}`}
              type="button"
              aria-label={slide.tipo === "video" ? "Ver video" : `Ver foto ${index + 1}`}
              onClick={() => irA(index)}
              className={`h-2 w-2 rounded-full ${index === activo ? "bg-primary" : "bg-outline-variant"}`}
            />
          ))}
        </div>
      ) : null}

      {lightboxAbierto && slideActivo?.tipo === "foto" ? (
        <Lightbox
          slides={slides.filter((s) => s.tipo === "foto")}
          activo={slides.filter((s) => s.tipo === "foto").findIndex((s) => s === slideActivo)}
          onNavegar={(index) => {
            const fotosSlides = slides.filter((s) => s.tipo === "foto");
            const target = fotosSlides[index];
            setActivo(slides.indexOf(target));
          }}
          onCerrar={() => setLightboxAbierto(false)}
          nombre={nombre}
        />
      ) : null}
    </div>
  );
}

export default PhotoGallery;
