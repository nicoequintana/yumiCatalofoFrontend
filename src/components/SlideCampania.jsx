import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * UN slide del carrusel de la home. No rota, no sabe que hay otros: la
 * rotación es de `CarruselCampanias`.
 *
 * NO CALCULA NADA. El destino llega resuelto a una ruta. Este componente decide
 * cómo se VE, nunca a dónde lleva.
 *
 * **El slide ENTERO es el enlace**, no un botón adentro. `interactivo={false}`
 * lo baja a un `<div>`: lo usa la vista previa del editor, donde el slide se
 * tiene que ver igual pero no navegar.
 */

/**
 * El fondo del molde compuesto (el slide SIN arte): SIEMPRE el color de marca.
 *
 * Hubo una lista cerrada de cinco pares fondo/texto que el admin elegía por
 * campaña. Se fue el 06/09/2026 junto con el botón: sin un control adentro, un
 * fondo por campaña era una decisión de marca tomada campaña por campaña, que
 * es justamente lo que una identidad visual no quiere. La columna `bannerColor`
 * quedó inerte en la base y el backend ya no emite `color`.
 *
 * ⚠️ El par va JUNTO (`bg-primary` + `text-on-primary`). Elegir el fondo de un
 * lado y el color del texto de otro es como se llega a blanco sobre ocre sin
 * que nada falle.
 */
const CLASES_MOLDE = "bg-primary text-on-primary";

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

  // EL SLIDE ENTERO ES EL ENLACE, no un botón dentro de él.
  //
  // Un banner es una superficie publicitaria: la expectativa de cualquiera que
  // lo ve es que se toca en cualquier lado, y un botón chico dentro de una
  // franja de 357 px obliga a apuntarle en móvil. Además liberó los ~32 px de
  // alto que ese botón ocupaba, que en un banner de 123 px era una cuarta parte.
  //
  // `interactivo={false}` es la vista previa del panel: ahí NO navega, porque
  // el admin está editando, no visitando. Cae a un `<div>` y se ve igual.
  const Envoltorio = interactivo && slide.ctaDestino ? Link : "div";
  const propsEnvoltorio =
    Envoltorio === Link
      ? {
          to: slide.ctaDestino,
          // El nombre accesible sale del TÍTULO, no del copy del CTA: un lector
          // de pantalla que anuncia "Ver más" no dice a dónde va. Con el
          // título, dice "Primavera, enlace".
          "aria-label": slide.titulo,
        }
      : {};

  return (
    <Envoltorio
      {...propsEnvoltorio}
      className={`relative flex h-full w-full items-center gap-4 overflow-hidden ${
        interactivo && slide.ctaDestino
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-background"
          : ""
      } ${hayArte ? "text-background" : `${CLASES_MOLDE} px-4 md:px-10`}`}
    >
      {hayArte ? (
        <>
          {/* `absolute inset-0`, NUNCA `h-full w-full` en flujo normal: un
              `<img>` con alto porcentual no resuelve contra `aspect-ratio`, el
              navegador cae a `height: auto` y la CAJA toma el ratio del
              archivo — el carrusel entero se estira. Cambiar `object-fit` no lo
              arregla: el problema es el tamaño de la caja. */}
          {/* ⚠️ EL `scale-[1.03]` NO ES UN AJUSTE ESTÉTICO: se come el marco
              claro con el que salen exportadas muchas piezas.

              `object-cover` ya llena el contenedor al 100 % (medido: 1152×320
              exactos, cero huecos). El problema no es que sobre espacio sino
              que el ARCHIVO trae un borde blanco: las dos piezas del 06/09/2026
              tenían luminancia 254 en los cuatro bordes contra 236 en el centro
              de la foto.

              Y solo se veía de un lado: a la izquierda el vidrio y el tinte lo
              tapan, a la derecha el arte va limpio y el marco quedaba a la
              vista contra el fondo crema, leyéndose como un borde y como un
              corte mal hecho.

              El 3 % recorta ~17 px del contenedor por lado (≈32 px del arte
              original), suficiente para los ~12 px de marco observados. Es el
              MÍNIMO que resuelve: subirlo recorta de más las piezas que están
              bien.

              ⚠️ Esto ESCONDE el problema, no lo arregla. Una pieza con marco
              más grueso vuelve a fallar y ya nadie va a saber por qué. La
              solución de fondo es exportar el arte a sangre, sin margen. */}
          <img
            src={slide.arteUrl}
            alt=""
            onError={() => setArteRoto(true)}
            className="absolute inset-0 h-full w-full scale-[1.03] object-cover"
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
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-md [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_55%,transparent_85%)] [mask-image:linear-gradient(to_right,#000_0%,#000_55%,transparent_85%)]"
          />
          {/* El TINTE, que es lo que garantiza el contraste del texto claro: el
              desenfoque no oscurece, así que sobre un arte claro el copy
              quedaría ilegible con vidrio solo. `on-surface-variant` y no
              `inverse-surface`: el segundo es el casi-negro (#1d1b1a) y sobre
              una foto se leía como una mancha; éste (#56423c) deja pasar el
              color del arte.

              ⚠️ EL PISO DEL TINTE NO ES ESTÉTICA: es lo único que separa el
              copy de una foto que sube el admin, y hasta el 07/09/2026 estaba
              calculado contra el arte que había, no contra el peor caso.
              Medido en Chromium a 390px con un arte PNG BLANCO —una foto de
              producto sobre fondo blanco, lo más común en e-commerce—:

                antes (`/75` desde 40 %, `/40` en 70 %) → peor píxel **2.54**,
                  el 100 % del área del copy por debajo de 4.5
                hoy   (`/90` desde 45 %, `/75` en 72 %) → peor píxel **5.13**,
                  0 % del área por debajo de 4.5

              Los DOS números se mueven juntos y el del medio es el que importa:
              la caja del copy llega al 64 % del ancho en móvil (52 % en
              escritorio), o sea bastante más allá del primer stop — subir solo
              el `from` deja la mitad derecha del texto igual de ilegible, que
              es exactamente lo que pasaba. El stop del medio se corrió además
              de 70 % a 72 % para que el degradé recién empiece a soltar
              DESPUÉS de donde puede haber texto. */}
          <div className="absolute inset-0 bg-gradient-to-r from-on-surface-variant/90 from-45% via-on-surface-variant/75 via-72% to-transparent" />
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

      {/* ⚠️ EL ANCHO MÁXIMO NO ES DECORATIVO: es la mitad del par que mantiene
          el copy legible. La otra mitad es la máscara del vidrio, que protege
          hasta el 55 % del ancho.
          Sin este tope, un título largo crece hasta donde le alcance y termina
          sobre la zona NÍTIDA de la derecha, que es justo donde el vidrio ya no
          lo separa del arte. Los dos números se mueven juntos: si la máscara
          cambia, este tope la sigue.
          En móvil el tope es más generoso (64 %) porque la caja es más angosta
          —2,9:1 contra 3,6:1— y a la mitad de 372 px no entra un título. */}
      <div
        className={`min-w-0 break-words ${
          hayArte ? "relative max-w-[64%] px-4 md:max-w-[52%] md:px-10" : ""
        }`}
      >
        {/* ⚠️ EL `line-clamp` NO ES ESTÉTICA: sin él el copy NO ENTRA en móvil.
            Medido a 412 px con el CTA todavía puesto: el banner mide 357×123 y
            el bloque de texto llegaba a 156 px de alto — un 127 %,
            sobresaliendo 16 px por abajo, y como el contenedor es
            `overflow-hidden` quedaba cortado contra el borde. Sacar el CTA
            (06/09/2026) devolvió ~32 px, o sea que el margen hoy es de un par
            de píxeles: un título de tres líneas vuelve a desbordar.
            Dos líneas para el título y dos para el texto es lo que entra. En
            `md+` se suelta (`line-clamp-none`): ahí sobran 320 px de alto y
            recortar sería perder copy sin motivo. Se corta con puntos
            suspensivos, que es honesto: avisa que hay más.
            Lo que NO se hace es achicar la tipografía hasta que entre — a 12 px
            sobre una foto el copy deja de leerse, y el problema vuelve con un
            texto un poco más largo. */}
        <p className="font-headline-sm text-headline-sm line-clamp-2 md:font-headline-lg md:text-headline-lg md:line-clamp-none">
          {slide.titulo}
        </p>
        {slide.texto ? (
          <p className="font-body-sm text-body-sm mt-1 line-clamp-2 opacity-90 md:font-body-md md:text-body-md md:line-clamp-none">
            {slide.texto}
          </p>
        ) : null}
      </div>
    </Envoltorio>
  );
}
