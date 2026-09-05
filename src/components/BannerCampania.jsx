import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * La franja de campaña de la home.
 *
 * EXISTE PORQUE EL CARTEL SE CIERRA. El modal estacional era la única puerta a
 * la vitrina de la campaña: quien lo cerraba —o sea, casi todo el mundo— perdía
 * el destino y no había forma de volver desde ninguna pantalla.
 *
 * NO CALCULA NADA. El destino llega resuelto a una ruta y el texto del botón
 * con su default aplicado. El banner NO tiene contador de días —ese es del
 * cartel, que conserva `modalFechaObjetivo`—, así que el texto se muestra tal
 * cual, sin buscar ningún marcador.
 *
 * `interactivo={false}` dibuja el CTA como `<span>`: lo usa `PreviewBanner` en
 * el editor del panel, donde el botón se tiene que VER pero no navegar.
 */

export default function BannerCampania({ banner, interactivo = true }) {
  // Una foto que ya no está en Cloudinary solo se descubre en runtime, igual
  // que en las cards de categoría: el `onError` es lo que evita el ícono roto.
  const [arteRoto, setArteRoto] = useState(false);

  if (!banner) return null;

  const hayArte = Boolean(banner.doodleUrl) && !arteRoto;
  const hayCta = Boolean(banner.ctaDestino) && Boolean(banner.ctaTexto);

  const claseCta =
    "inline-flex shrink-0 items-center gap-2 rounded-full bg-inverse-surface px-6 py-3 font-label-md text-label-md text-background transition-opacity hover:opacity-90";

  return (
    <section
      aria-labelledby="titulo-banner-campania"
      className="mx-auto w-full max-w-container-max px-margin-mobile pt-12 md:px-margin-desktop"
    >
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:flex-row sm:items-center sm:gap-6">
        {/* El arte va `absolute inset-0` dentro de la caja con `aspect-square`.
            En flujo normal, un `<img>` con alto porcentual no resuelve contra
            `aspect-ratio`: el navegador cae a `height: auto` y la CAJA toma el
            ratio del archivo, estirando la franja entera. */}
        <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
          {hayArte ? (
            <img
              src={banner.doodleUrl}
              alt=""
              onError={() => setArteRoto(true)}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[32px] text-primary"
            >
              local_offer
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2
            id="titulo-banner-campania"
            className="font-headline-sm text-headline-sm text-on-surface"
          >
            {banner.titulo}
          </h2>

          {banner.texto ? (
            <p className="font-body-md text-body-md mt-1 text-on-surface-variant">{banner.texto}</p>
          ) : null}
        </div>

        {hayCta ? (
          interactivo ? (
            <Link to={banner.ctaDestino} className={claseCta}>
              {banner.ctaTexto}
            </Link>
          ) : (
            <span className={claseCta}>{banner.ctaTexto}</span>
          )
        ) : null}
      </div>
    </section>
  );
}
