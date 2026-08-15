import { useState } from "react";

/**
 * Product detail image panel, ported from detalle-producto.html L149-167.
 *
 * Dot count == foto count (1-4, per spec's "hasta 4 fotos"), NO arrows
 * (mockup only has dot indicators), NO color swatches (removed per the
 * finalized design decision). When a video is present it is exposed as an
 * extra "slide" reachable from the dots, matching the spec scenario
 * "the video is accessible from the gallery".
 */
function PhotoGallery({ fotos = [], video = null, nombre = "" }) {
  const [activo, setActivo] = useState(0);

  const slides = [
    ...fotos.map((foto) => ({ tipo: "foto", ...foto })),
    ...(video ? [{ tipo: "video", ...video }] : []),
  ];

  const slideActivo = slides[activo];

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
          alt={nombre}
          className="relative z-10 max-h-[80%] w-3/4 object-contain"
          src={slideActivo.url}
        />
      ) : null}

      {slides.length >= 1 ? (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 transform gap-2">
          {slides.map((slide, index) => (
            <button
              key={`${slide.tipo}-${slide.id ?? index}`}
              type="button"
              aria-label={slide.tipo === "video" ? "Ver video" : `Ver foto ${index + 1}`}
              onClick={() => setActivo(index)}
              className={`h-2 w-2 rounded-full ${index === activo ? "bg-primary" : "bg-outline-variant"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default PhotoGallery;
