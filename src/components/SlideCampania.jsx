import { useState } from "react";
import { Link } from "react-router-dom";
import { registrarEventoComercial } from "../api/campanias.js";

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
 *
 * ⚠️ **Decisión de usuario 2026-09-14: la imagen se muestra COMPLETA, sin
 * tinte, vidrio ni copy encima.** El admin dejó de escribir título/texto de un
 * banner (campaña o promoción) — solo decide si se muestra (el interruptor) y
 * qué imagen sube. El texto vive DENTRO de la pieza que sube el admin, no en
 * una capa de HTML superpuesta. `slide.titulo`/`slide.texto` siguen llegando
 * del backend (la columna y el mapeo no se tocaron) pero ya no se pintan acá
 * — ver `MOSTRAR_COPY_SLIDE` más abajo. Lo que SÍ se sigue usando es el
 * título como NOMBRE ACCESIBLE del link (y, a falta de título, el nombre de
 * la campaña/promoción): un banner sin copy visible igual necesita decirle a
 * un lector de pantalla a dónde lleva.
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

/**
 * Oculta el título y el texto del slide, sin borrarlos del componente.
 *
 * Decisión de usuario 2026-09-14: "para los banners, de ahora en más el
 * admin solo decide si se muestra en el catálogo y qué imagen sube — el
 * texto vive en la imagen". El dato sigue viajando (se usa como nombre
 * accesible, ver `nombreAccesible` abajo) para poder reactivar el copy más
 * adelante con solo volver esta constante a `true`.
 */
const MOSTRAR_COPY_SLIDE = false;

export default function SlideCampania({ slide, interactivo = true }) {
  // Una foto que ya no está en Cloudinary solo se descubre en runtime, igual
  // que en las cards de categoría: el `onError` es lo que evita el ícono roto,
  // y acá además hace que el slide caiga al molde compuesto en vez de quedar
  // en blanco.
  const [arteRoto, setArteRoto] = useState(false);
  const [doodleRoto, setDoodleRoto] = useState(false);

  if (!slide) return null;

  const hayArte = Boolean(slide.arteUrl) && !arteRoto;
  const hayDoodle = Boolean(slide.doodleUrl) && !doodleRoto;

  // Nombre accesible: el título cargado si existe, si no el NOMBRE de la
  // campaña/promoción (`slide.nombre`). Decisión de usuario 2026-09-14: el
  // título del banner dejó de ser obligatorio, así que un slide puede llegar
  // sin él — el link igual necesita decir algo.
  const nombreAccesible = slide.titulo || slide.nombre;

  // EL SLIDE ENTERO ES EL ENLACE, no un botón dentro de él.
  //
  // Un banner es una superficie publicitaria: la expectativa de cualquiera que
  // lo ve es que se toca en cualquier lado, y un botón chico dentro de una
  // franja de 357 px obliga a apuntarle en móvil.
  //
  // `interactivo={false}` es la vista previa del panel: ahí NO navega, porque
  // el admin está editando, no visitando. Cae a un `<div>` y se ve igual.
  const Envoltorio = interactivo && slide.ctaDestino ? Link : "div";
  const propsEnvoltorio =
    Envoltorio === Link
      ? {
          to: slide.ctaDestino,
          // El nombre accesible sale del TÍTULO (o del nombre, a falta de
          // título), no del copy del CTA: un lector de pantalla que anuncia
          // "Ver más" no dice a dónde va. Con el nombre, dice "Primavera,
          // enlace".
          "aria-label": nombreAccesible,
          // El click no espera la respuesta: el `Link` navega igual. Va solo en
          // esta rama — la del `div` es la vista previa del editor y no emite.
          onClick: () => {
            registrarEventoComercial({
              tipo: "CLICK_COMERCIAL",
              origen: "BANNER",
              campaniaId: slide.campaniaId ?? null,
              promocionId: slide.promocionId ?? null,
              destino: slide.ctaTipo,
            });
          },
        }
      : {};

  return (
    <Envoltorio
      {...propsEnvoltorio}
      className={`relative flex h-full w-full items-center gap-4 overflow-hidden ${
        interactivo && slide.ctaDestino
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-background"
          : ""
      } ${hayArte ? "" : `${CLASES_MOLDE} px-4 md:px-10`}`}
    >
      {hayArte ? (
        /* `absolute inset-0`, NUNCA `h-full w-full` en flujo normal: un
           `<img>` con alto porcentual no resuelve contra `aspect-ratio`, el
           navegador cae a `height: auto` y la CAJA toma el ratio del
           archivo — el carrusel entero se estira. Cambiar `object-fit` no lo
           arregla: el problema es el tamaño de la caja.

           ⚠️ EL `scale-[1.03]` NO ES UN AJUSTE ESTÉTICO: se come el marco
           claro con el que salen exportadas muchas piezas. `object-cover` ya
           llena el contenedor al 100 % (medido: 1152×320 exactos, cero
           huecos); el problema no es que sobre espacio sino que el ARCHIVO
           trae un borde blanco (luminancia 254 en los cuatro bordes contra
           236 en el centro de la foto, medido el 06/09/2026). El 3 % recorta
           ~17 px del contenedor por lado (≈32 px del arte original),
           suficiente para el marco observado. Es el MÍNIMO que resuelve:
           subirlo recorta de más las piezas que están bien.

           ⚠️ Esto ESCONDE el problema, no lo arregla. Una pieza con marco
           más grueso vuelve a fallar y ya nadie va a saber por qué. La
           solución de fondo es exportar el arte a sangre, sin margen.

           Desde el 14/09/2026 la imagen se muestra COMPLETA y sola: el
           tinte, el vidrio desenfocado y el degradé que existían para
           proteger la legibilidad del copy encima se retiraron con el copy
           — sin texto que proteger, esa capa ya no cumplía ningún propósito. */
        <img
          src={slide.arteUrl}
          alt=""
          onError={() => setArteRoto(true)}
          className="absolute inset-0 h-full w-full scale-[1.03] object-cover"
        />
      ) : hayDoodle ? (
        /* El doodle solo aparece SIN arte. Con arte, la imagen ocupa el slide
           entero y un segundo elemento encima sería ruido. */
        <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-full bg-surface-container-lowest md:w-28">
          <img
            src={slide.doodleUrl}
            alt=""
            onError={() => setDoodleRoto(true)}
            className="absolute inset-0 h-full w-full object-contain p-2"
          />
        </div>
      ) : null}

      {/* Título y texto: OCULTOS por decisión de usuario 2026-09-14, el texto
          vive en la imagen. Reactivar es volver `MOSTRAR_COPY_SLIDE` a
          `true` — el dato sigue viajando igual (ver `nombreAccesible`). */}
      {MOSTRAR_COPY_SLIDE ? (
        <div className="min-w-0 break-words">
          <p className="font-headline-sm text-headline-sm line-clamp-2 lg:font-headline-lg lg:text-headline-lg md:line-clamp-none">
            {slide.titulo}
          </p>
          {slide.texto ? (
            <p className="font-body-sm text-body-sm mt-1 line-clamp-2 opacity-90 md:font-body-md md:text-body-md md:line-clamp-none">
              {slide.texto}
            </p>
          ) : null}
        </div>
      ) : null}
    </Envoltorio>
  );
}
