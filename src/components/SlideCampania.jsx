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
 * ⚠️ **No exportado a propósito.** `SeccionBanner` (campañas) y
 * `SeccionBannerPromocion` (promociones) necesitan solo el fondo (la
 * pastilla de muestra no lleva texto encima); lo importan de
 * `components/admin/campanias/muestraColor.js` (`MUESTRA_COLOR`), NO de acá
 * — exportar este mapa rompería el Fast Refresh del archivo (`oxlint` avisa
 * `react/only-export-components`) porque dejaría de exportar solo un
 * componente. `muestraColor.js` sigue siendo una copia manual de la mitad
 * "fondo" de este mapa (06/09/2026): la sincronización entre los dos está
 * registrada en el censo de `CLAUDE.md`, que sigue contando TRES casas
 * (backend, este archivo y `muestraColor.js`) — compartir el módulo entre
 * `SeccionBanner` y `SeccionBannerPromocion` evitó una CUARTA copia por
 * consumidor, no eliminó la tercera.
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
              escritorio.

              ⚠️ EL VIDRIO ES UNA COPIA DESENFOCADA DE LA FOTO, NO UN
              `backdrop-filter`. Y ES POR RENDIMIENTO, no por gusto.

              `backdrop-filter` muestrea lo que tiene DETRÁS, así que hay que
              recalcularlo en cada frame en el que el fondo o el propio elemento
              cambian. El carrusel cruza los slides con `transition-opacity` de
              500 ms (`CarruselCampanias.jsx`), y una opacidad menor que 1 crea
              un stacking context: durante medio segundo el navegador
              recomponía DOS backdrops a la vez sobre un fondo que también se
              estaba moviendo. Se veía como que el vidrio "tardaba en cargar".

              `filter: blur()` sobre esta copia no mira el fondo: se rasteriza
              una vez y la transición de opacidad la mueve como a cualquier
              otra capa. El resultado en pantalla es el mismo.

              El `scale-110` no es decorativo: `blur()` samplea más allá del
              borde del elemento, y sin sobredimensionar la copia el desenfoque
              se degrada a transparente en los bordes y deja una orla clara.

              La máscara —duplicada con `-webkit-` para Safari— es lo que hace
              que el vidrio se desvanezca hacia la derecha y deje el arte
              nítido donde no hay texto. */}
          <img
            src={slide.arteUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-md [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_42%,transparent_74%)] [mask-image:linear-gradient(to_right,#000_0%,#000_42%,transparent_74%)]"
          />
          {/* El TINTE, que es lo que garantiza el contraste del texto claro: el
              desenfoque no oscurece, así que sobre un arte claro el copy
              quedaría ilegible con vidrio solo. `on-surface-variant` y no
              `inverse-surface`: el segundo es el casi-negro (#1d1b1a) y sobre
              una foto se leía como una mancha; éste (#56423c) deja pasar el
              color del arte. */}
          <div className="absolute inset-0 bg-gradient-to-r from-on-surface-variant/75 via-on-surface-variant/40 to-transparent" />
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
