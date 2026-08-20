import { useState } from "react";
import Lightbox from "./Lightbox.jsx";

/**
 * Product detail gallery — redesigned for the "Vibrant Editorial Discovery"
 * hero layout: one large photo/video on top (aspect-square, rounded-xl,
 * soft-shadow) with a horizontal-scroll row of square thumbnails below
 * (remaining photos + the video, if any, with a play icon overlay). Clicking
 * a photo thumbnail swaps the large slide; clicking the video thumbnail
 * swaps to the video (native controls, same as before — no autoplay).
 * Clicking the large slide when it's a photo opens the existing Lightbox.
 *
 * The thumbnail row is hidden entirely when there's nothing to switch to
 * (a single photo and no video) — a row of one thumbnail duplicating the
 * hero image would be visual noise.
 *
 * `compacto` caps the main slide's height. The `aspect-[4/5]` ratio is right
 * for a full page, but inside the admin's preview pane it renders ~1000px
 * tall and pushes the name, price and CTA out of view — exactly what the
 * admin opened the preview to see.
 */
function PhotoGallery({ fotos = [], video = null, nombre = "", compacto = false }) {
  const [activo, setActivo] = useState(0);
  const [lightboxAbierto, setLightboxAbierto] = useState(false);

  const slides = [
    ...fotos.map((foto) => ({ tipo: "foto", ...foto })),
    ...(video ? [{ tipo: "video", ...video }] : []),
  ];

  // El índice se acota en cada render en vez de guardarse "corregido" en el
  // estado: la lista de slides puede encogerse debajo (el editor del admin
  // borra fotos mientras la vista previa está abierta) y un `activo` que quedó
  // apuntando fuera de rango dejaba el slide grande completamente en blanco.
  const indiceActivo = slides.length === 0 ? 0 : Math.min(activo, slides.length - 1);
  const slideActivo = slides[indiceActivo];
  const mostrarThumbnails = slides.length > 1;

  function irA(index) {
    setActivo(index);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient ${
          compacto ? "max-h-[460px]" : "md:aspect-[4/5]"
        }`}
      >
        {slideActivo?.tipo === "video" ? (
          <video className="h-full w-full object-cover" src={slideActivo.url} controls />
        ) : slideActivo ? (
          // Slide principal: es la imagen más grande y visible de la ficha,
          // así que va `eager` a propósito — diferirla retrasaría el LCP en vez
          // de ahorrar ancho de banda. Las miniaturas de abajo sí van `lazy`.
          <img
            key={slideActivo.id ?? indiceActivo}
            alt={nombre}
            onClick={() => setLightboxAbierto(true)}
            className="h-full w-full cursor-zoom-in object-cover animate-fadeIn"
            src={slideActivo.url}
            loading="eager"
            decoding="async"
          />
        ) : null}
      </div>

      {mostrarThumbnails ? (
        <div className="flex w-full gap-3 overflow-x-auto pb-1">
          {slides.map((slide, index) => (
            <button
              key={`${slide.tipo}-${slide.id ?? index}`}
              type="button"
              onClick={() => irA(index)}
              aria-label={slide.tipo === "video" ? "Ver video" : `Ver foto ${index + 1}`}
              aria-current={index === indiceActivo}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors md:h-20 md:w-20 ${
                index === indiceActivo ? "border-primary" : "border-transparent"
              }`}
            >
              {slide.tipo === "video" ? (
                <>
                  <video className="h-full w-full object-cover" src={slide.url} muted />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="material-symbols-outlined text-[22px] text-white">play_arrow</span>
                  </span>
                </>
              ) : (
                <img
                  className="h-full w-full object-cover"
                  src={slide.url}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </button>
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
