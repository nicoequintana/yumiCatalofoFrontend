import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * UN slide del carrusel de la home. No rota, no sabe que hay otros: la
 * rotación es de `CarruselCampanias`.
 *
 * NO CALCULA NADA. El destino llega resuelto a una ruta, el texto del botón con
 * su default aplicado y el color con el suyo. Este componente decide cómo se
 * VE, nunca qué dice.
 *
 * `interactivo={false}` dibuja el CTA como `<span>`: lo usa la vista previa del
 * editor, donde el botón se tiene que ver pero no navegar.
 */

/**
 * El par fondo/texto de cada color de la lista cerrada del backend.
 *
 * ⚠️ **Los dos salen juntos, y esa es toda la gracia.** Emparejarlos acá es lo
 * que garantiza que nunca exista una combinación ilegible; si el color viniera
 * suelto y el texto se eligiera aparte, alguien terminaría con blanco sobre
 * ocre sin que nada falle.
 *
 * ⚠️ **`inverse-on-surface` no existe en este proyecto.** El par del tono
 * oscuro es `bg-inverse-surface` + `text-background`, igual que el CTA del
 * hero. Una clase que no existe no emite ninguna regla: el color queda
 * heredado y el texto puede volverse invisible, sin error y sin test rojo.
 *
 * ⚠️ **No exportado a propósito.** `SeccionBanner` necesita solo el fondo (la
 * pastilla de muestra no lleva texto encima) y tiene su propia copia,
 * `MUESTRA_COLOR` — exportar este mapa acá rompe el Fast Refresh del archivo
 * (`oxlint` avisa `react/only-export-components`) porque deja de exportar
 * solo un componente. La sincronización manual entre los dos mapas está
 * registrada en el censo de `CLAUDE.md`.
 */
const COLORES = {
  TERRACOTA: "bg-primary text-on-primary",
  VERDE: "bg-secondary text-on-secondary",
  OCRE: "bg-tertiary-container text-on-tertiary-container",
  TINTA: "bg-inverse-surface text-background",
  ARENA: "bg-surface-container-high text-on-surface",
};

/** El de la marca. Espeja `COLOR_SLIDE_POR_DEFECTO` de `lib/campanias.js`. */
const COLOR_POR_DEFECTO = "TERRACOTA";

export default function SlideCampania({ slide, interactivo = true }) {
  // Una foto que ya no está en Cloudinary solo se descubre en runtime, igual
  // que en las cards de categoría: el `onError` es lo que evita el ícono roto,
  // y acá además hace que el slide caiga al molde compuesto en vez de quedar
  // en blanco.
  //
  // `alt=""` es deliberado: el título ya está como texto al lado (el `<p>`
  // de abajo). Con un `alt` igual a ese título, un lector de pantalla lo
  // anuncia dos veces seguidas — la imagen y después el texto. La imagen es
  // decorativa a efectos de accesibilidad, mismo criterio que el doodle de
  // `BannerCampania`.
  const [arteRoto, setArteRoto] = useState(false);
  const [doodleRoto, setDoodleRoto] = useState(false);

  if (!slide) return null;

  const hayArte = Boolean(slide.arteUrl) && !arteRoto;
  const hayDoodle = Boolean(slide.doodleUrl) && !doodleRoto;
  const hayCta = Boolean(slide.ctaDestino) && Boolean(slide.ctaTexto);
  const clasesColor = COLORES[slide.color] ?? COLORES[COLOR_POR_DEFECTO];

  const claseCta =
    "mt-2 inline-flex w-max items-center rounded-full bg-surface-container-lowest px-5 py-2 font-label-md text-label-md text-on-surface";

  return (
    <div
      className={`relative flex h-full w-full items-center gap-4 overflow-hidden ${
        hayArte ? "text-background" : `${clasesColor} px-4 md:px-10`
      }`}
    >
      {hayArte ? (
        <>
          {/* `absolute inset-0`, NUNCA `h-full w-full` en flujo normal: un
              `<img>` con alto porcentual no resuelve contra `aspect-ratio`, el
              navegador cae a `height: auto` y la CAJA toma el ratio del
              archivo — el carrusel entero se estira. Cambiar `object-fit` no lo
              arregla: el problema es el tamaño de la caja. */}
          <img
            src={slide.arteUrl}
            alt=""
            onError={() => setArteRoto(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* El velo va de izquierda a derecha porque la ZONA SEGURA del copy
              es el tercio izquierdo: es lo que hace que la misma pieza
              sobreviva al recorte de 2,9:1 en móvil y al de 3,6:1 en
              escritorio. */}
          <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface via-inverse-surface/70 to-transparent" />
        </>
      ) : hayDoodle ? (
        /* El doodle solo aparece SIN arte. Con arte, dos imágenes en 135 px de
           alto es ruido. */
        <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-full bg-surface-container-lowest md:w-28">
          <img
            src={slide.doodleUrl}
            alt=""
            onError={() => setDoodleRoto(true)}
            className="absolute inset-0 h-full w-full object-contain p-2"
          />
        </div>
      ) : null}

      <div className={`min-w-0 ${hayArte ? "relative px-4 md:px-10" : ""}`}>
        <p className="font-headline-sm text-headline-sm md:font-headline-lg md:text-headline-lg">
          {slide.titulo}
        </p>
        {slide.texto ? (
          <p className="font-body-md text-body-md mt-1 opacity-90">{slide.texto}</p>
        ) : null}
        {hayCta ? (
          interactivo ? (
            <Link to={slide.ctaDestino} className={claseCta}>
              {slide.ctaTexto}
            </Link>
          ) : (
            <span className={claseCta}>{slide.ctaTexto}</span>
          )
        ) : null}
      </div>
    </div>
  );
}
