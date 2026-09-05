import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * La franja de campaña de la home.
 *
 * EXISTE PORQUE EL CARTEL SE CIERRA. El modal estacional era la única puerta a
 * la vitrina de la campaña: quien lo cerraba —o sea, casi todo el mundo— perdía
 * el destino y no había forma de volver desde ninguna pantalla.
 *
 * NO CALCULA NADA. El destino llega resuelto a una ruta, el texto del botón con
 * su default aplicado y los días ya contados contra el día argentino. Acá solo
 * se sustituye `{dias}` en el texto, que es presentación.
 *
 * `interactivo={false}` dibuja el CTA como `<span>`: lo usa `PreviewBanner` en
 * el editor del panel, donde el botón se tiene que VER pero no navegar.
 */

/** El marcador que el admin escribe en el texto para que entre el contador. */
const MARCADOR_DIAS = /\{dias\}/g;

function conDias(texto, diasFaltantes) {
  if (!texto) return null;
  // Sin contador, el marcador se saca en vez de mostrarse crudo: "{dias}" en la
  // home es basura visible para el cliente. Sacarlo dejaba el espacio de cada
  // lado ("Faltan  días."): se colapsan los espacios repetidos y se recortan
  // las puntas.
  return texto
    .replace(MARCADOR_DIAS, diasFaltantes === null ? "" : String(diasFaltantes))
    .replace(/ {2,}/g, " ")
    .trim();
}

export default function BannerCampania({ banner, interactivo = true }) {
  // Una foto que ya no está en Cloudinary solo se descubre en runtime, igual
  // que en las cards de categoría: el `onError` es lo que evita el ícono roto.
  const [arteRoto, setArteRoto] = useState(false);

  if (!banner) return null;

  const texto = conDias(banner.texto, banner.diasFaltantes);
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
          {/* `modalFechaObjetivo` es independiente de `hasta`: una campaña
              vigente con el objetivo ya pasado es legal, y el backend puede
              mandar un `diasFaltantes` negativo. "-3 días" no es un dato que
              el cliente pueda leer, así que la píldora se apaga con `null` o
              con cualquier valor negativo — solo `0` en adelante cuenta. */}
          {banner.diasFaltantes === null || banner.diasFaltantes < 0 ? null : (
            <p className="font-label-sm text-label-sm mb-2 inline-flex items-center rounded-full bg-primary px-3 py-1 uppercase text-on-primary">
              {banner.diasFaltantes === 0
                ? "Último día"
                : `${banner.diasFaltantes} ${banner.diasFaltantes === 1 ? "día" : "días"}`}
            </p>
          )}

          <h2
            id="titulo-banner-campania"
            className="font-headline-sm text-headline-sm text-on-surface"
          >
            {banner.titulo}
          </h2>

          {texto ? (
            <p className="font-body-md text-body-md mt-1 text-on-surface-variant">{texto}</p>
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
