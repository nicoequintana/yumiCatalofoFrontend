import { Link } from "react-router-dom";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import CarruselDestacados from "../components/CarruselDestacados.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import useDestacados from "../hooks/useDestacados.js";
import { SENALES_CONFIANZA } from "../constants/hero.js";
import { urlAbsoluta } from "../constants/seo.js";
import heroImg from "../assets/hero.jpg";

/**
 * Revelado escalonado de la entrada del hero.
 *
 * `animationFillMode: "backwards"` NO es opcional: sin él, durante el retardo
 * el elemento se pinta en su estado final (opacidad 1) y recién al arrancar la
 * animación salta a 0 — un parpadeo, exactamente lo contrario del efecto
 * buscado. La clase va con la variante `motion-safe:`, así que con
 * `prefers-reduced-motion` no hay animación y este `style` queda inerte.
 */
function revelado(retardoMs) {
  return { animationDelay: `${retardoMs}ms`, animationFillMode: "backwards" };
}

/**
 * Señales de confianza del hero, en sus dos formas.
 *
 * `compacto` es la variante de la tarjeta flotante sobre la foto en móvil:
 * mismo contenido, etiquetas más cortas (`textoCompacto`) y tamaño menor. Es el
 * mismo patrón de prop que ya usa `FichaProducto` para el panel de vista previa
 * del admin — una variante declarada, no clases sueltas desde afuera.
 */
function SenalesConfianza({ compacto = false }) {
  return (
    <ul
      // Caja normal y NO mayúsculas, a diferencia de la píldora de arriba: en
      // el mockup esta fila es un pie discreto, no un rótulo. Además, en
      // mayúsculas con el tracking de `label-sm` los cuatro ítems no entran en
      // una línea dentro de la columna de texto.
      className={`flex items-center font-body-md text-[14px] leading-tight text-on-surface-variant ${
        compacto
          ? "flex-wrap justify-center gap-x-3 gap-y-2"
          : // Una sola línea: la fila en línea es un pie del hero, y partida en
            // dos deja de leerse como un renglón de credenciales.
            "flex-nowrap gap-x-2 whitespace-nowrap"
      }`}
    >
      {SENALES_CONFIANZA.filter((senal) => !(compacto && senal.soloEscritorio)).map(
        (senal, indice) => (
        <li key={senal.texto} className={`flex items-center ${compacto ? "gap-3" : "gap-2"}`}>
          {indice > 0 ? (
            <span aria-hidden="true" className="text-outline">
              •
            </span>
          ) : null}
          {/* En la fila en línea el ícono va SOLO al principio; en la tarjeta
              compacta van los dos que declara el dato. No es un capricho: son
              las dos composiciones del mockup, y con los cuatro ítems en una
              línea un segundo ícono a mitad de camino corta la lectura en dos
              bloques en vez de rematarla. */}
          {senal.icono && (compacto || indice === 0) ? (
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">
              {senal.icono}
            </span>
          ) : null}
          {/* La etiqueta va envuelta y no como nodo de texto suelto: los íconos
              de Material Symbols escriben su NOMBRE como contenido de texto, así
              que el `textContent` del <li> sería "verified_userProductos
              seleccionados" y ninguna consulta por texto encontraría la
              etiqueta. */}
          <span>{compacto ? (senal.textoCompacto ?? senal.texto) : senal.texto}</span>
        </li>
        ),
      )}
    </ul>
  );
}

/**
 * `/` — home editorial, per design doc
 * 2026-08-19-separacion-home-coleccion.md.
 *
 * Esta página es la vidriera de marca: Hero + carrusel de destacados +
 * manifiesto. El catálogo completo con filtros vive ahora en `/coleccion`
 * (`Coleccion.jsx`) — antes ambas cosas compartían un solo scroll acá, lo
 * que mezclaba dos trabajos distintos (enganchar vs. buscar) e impedía
 * compartir un link de productos filtrados sin arrastrar todo el contenido
 * editorial.
 */
function Catalogo() {
  const { productos: destacados } = useDestacados();

  return (
    <>
      <MetaSeo
        titulo="YIMA — Productos útiles, innovadores y con diseño"
        descripcion="Productos útiles, innovadores y con diseño que simplifican tu rutina y suman estilo a tu hogar, tu trabajo y tus momentos."
        canonical={urlAbsoluta("/")}
      />

      {/* Hero — dos columnas con la foto a sangre contra el borde derecho.
          La `<section>` NO lleva `max-w-container-max`: si lo llevara, la foto
          se cortaría en el borde del contenedor en vez de llegar al borde de la
          ventana. La alineación del contenido con el resto de la página se
          recupera en la columna de texto (ver el comentario de `max-w-[36rem]`). */}
      <section className="relative w-full overflow-hidden">
        <div className="grid grid-cols-1 lg:min-h-[42rem] lg:grid-cols-2">
          {/* `relative z-10` es obligatorio, no cosmético: de `lg` para arriba
              la foto desborda su columna y se mete por debajo de este bloque.
              Sin contexto de apilado propio, la foto —que va después en el
              DOM— se pintaría ENCIMA del titular. */}
          <div className="relative z-10 flex items-center px-margin-mobile py-14 lg:px-margin-desktop lg:py-20">
            {/* 36rem = 576px = (1280px de container-max ÷ 2) − 64px de margen.
                Con `lg:ml-auto` el borde izquierdo de este bloque cae exactamente
                sobre el margen del contenedor, así el texto queda alineado con el
                resto de la página aunque la sección sea de ancho completo.
                Atarlo a `max-w-container-max` impediría el sangrado de la foto. */}
            <div className="w-full max-w-[36rem] lg:ml-auto lg:mr-0">
              <span
                style={revelado(0)}
                className="inline-block w-max rounded-full border border-outline-variant px-4 py-2 font-label-sm text-label-sm uppercase text-on-surface-variant motion-safe:animate-fadeIn"
              >
                Útiles • Innovadores • Para tu día a día
              </span>

              <h1
                style={revelado(80)}
                className="mt-6 font-display-xl-mobile text-display-xl-mobile text-on-surface motion-safe:animate-fadeIn lg:mt-8 lg:font-display-xl lg:text-display-xl"
              >
                Descubrí cosas que te hacen la vida{" "}
                {/* El acento va en un <span> DENTRO del h1: el nombre accesible
                    del encabezado sigue siendo la frase completa. */}
                <span className="text-primary">más fácil.</span>
              </h1>

              <p
                style={revelado(160)}
                className="mt-6 max-w-[34rem] font-body-lg text-body-lg text-on-surface-variant motion-safe:animate-fadeIn"
              >
                En YIMA reunimos productos útiles, innovadores y con diseño que simplifican tu
                rutina y suman estilo a tu hogar, tu trabajo y tus momentos.
              </p>

              {/* UN SOLO CTA. El mockup traía dos, pero los dos apuntaban a
                  `/coleccion`: un botón sólido y un link de texto que hacen lo
                  mismo no son una jerarquía, son la misma acción pidiéndose dos
                  veces, y obligan a elegir entre opciones idénticas. Se conserva
                  el que nombra el destino ("Ver productos"), con el peso visual
                  del principal — un hero cuya única acción va en borde suave se
                  lee como si no hubiera nada que hacer.

                  Ancho completo en móvil (el pulgar apunta a un blanco grande) y
                  al ancho de su texto de `sm` para arriba. */}
              <Link
                to="/coleccion"
                style={revelado(240)}
                className="group mt-8 flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-inverse-surface px-8 py-4 font-label-md text-label-md text-background transition-colors motion-safe:animate-fadeIn hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-max lg:mt-10"
              >
                Ver productos
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1"
                >
                  arrow_forward
                </span>
              </Link>

              {/* Variante en línea, solo escritorio. La de móvil es la tarjeta
                  flotante sobre la foto — ver `constants/hero.js` por qué son
                  dos nodos y no uno. */}
              <div style={revelado(320)} className="mt-10 hidden motion-safe:animate-fadeIn lg:block">
                <SenalesConfianza />
              </div>
            </div>
          </div>

          {/* Columna de la foto. En móvil el alto sale del `aspect-[4/5]`; en
              `lg` se cancela y el div estira al alto de la fila del grid. */}
          {/* El solapamiento con el texto lo produce ESTE contenedor, no la
              <img>: con `lg:-ml-[45%]` la celda del grid crece hacia la
              izquierda y la imagen la llena con el `inset-0 h-full w-full` de
              siempre.

              Se intentó primero estirando la propia <img> (`-left` + `w-[145%]`)
              y no funciona por dos razones que conviene no volver a pisar:
              `w-full` le gana en la cascada a la variante `lg:` del ancho —así
              que el `left` negativo se aplicaba y el ancho no, y la foto
              quedaba corrida dejando una franja de fondo a la derecha— y, aun
              resolviendo eso, un elemento REEMPLAZADO en posición absoluta con
              `width:auto` usa su ancho intrínseco e ignora el `right`. Movido
              al contenedor, el ancho de la imagen no depende de ninguna de las
              dos cosas.

              El `-mt-16` de móvil es el equivalente vertical: sube la foto para
              que su borde superior —ya disuelto por la máscara— quede por
              debajo del texto en vez de arrancar con un corte limpio bajo el
              botón. Cada uno se cancela en el breakpoint del otro. */}
          <div className="relative -mt-16 aspect-[4/5] w-full bg-background lg:-ml-[45%] lg:mt-0 lg:aspect-auto lg:h-full lg:w-auto">
            {/* La imagen va `absolute inset-0`, NUNCA `h-full w-full` en flujo
                normal. Es el gotcha de CSS con elementos reemplazados que ya
                mordió en ProductCard y MediaUploader: un <img> en flujo con
                alto en porcentaje no puede resolverlo contra un contenedor cuyo
                alto viene de `aspect-ratio`, el navegador cae a `height: auto`
                y la CAJA ENTERA se estira al aspect ratio intrínseco del
                archivo. Cambiar el `object-fit` no lo arregla: el problema es
                el tamaño de la caja, no el recorte del contenido.

                Es el elemento LCP de la home: `eager` + `fetchPriority="high"`,
                nunca `lazy`. `width`/`height` son los del ARCHIVO (1672×941):
                con la imagen fuera de flujo no reservan layout —de eso se
                encarga el `aspect-[4/5]` del contenedor— pero le declaran al
                navegador la relación de aspecto real del recurso.

                **El encuadre se dirige con `object-position`, y hace falta uno
                por breakpoint.** La foto es apaisada (1.78) y las dos cajas son
                mucho más angostas, así que `object-cover` descarta buena parte
                del ancho: en escritorio se ve el 63% del archivo y en móvil solo
                el 45%. Con el default (`center`) móvil se queda con la pared
                vacía de la izquierda y pierde la mitad del bodegón.

                - `65%` en móvil: ventana ~600–1350 del archivo. Entra la lámpara
                  entera, el vaso y medio organizador, sin el hueco de pared.
                - `right` en escritorio: ventana ~615–1672. Es el recorte del
                  mockup — lo único que se pierde es la pared vacía, que en esta
                  composición ya la aporta la columna de texto. */}
            <img
              className="hero-fundido absolute inset-0 h-full w-full object-cover object-[65%_center] lg:object-right"
              src={heroImg}
              alt="Lámpara, vaso térmico, organizador y estuche de la selección YIMA sobre una mesa con luz natural"
              width={1672}
              height={941}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />

            {/* Fondo SÓLIDO, sin modificador de opacidad. Los colores de este
                proyecto son `var(--color-x)` con un hex adentro, y Tailwind 3
                no puede componerles alfa: al no encontrar ni un color parseable
                ni el placeholder `<alpha-value>`, NO EMITE la regla — la clase
                queda sin CSS y el elemento termina transparente, sin error ni
                aviso. Acá eso dejaba la tarjeta ilegible sobre la foto. Por lo
                mismo no hay `backdrop-blur`: sobre una superficie opaca no
                aporta nada. */}
            <div className="absolute inset-x-4 bottom-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-ambient lg:hidden">
              <SenalesConfianza compacto />
            </div>
          </div>
        </div>
      </section>

      <CarruselDestacados productos={destacados} />

      {/* Manifiesto de marca — cierre editorial antes del footer.
          Sin botón CTA: no existe una página "Sobre nosotros" en el
          proyecto (ver design doc 2026-08-19), un link ahí sería un enlace
          roto o alcance nuevo fuera de esta spec. */}
      <section className="relative w-full overflow-hidden bg-cream-base px-margin-mobile py-32 md:px-margin-desktop">
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <span className="material-symbols-outlined text-4xl text-moss-green opacity-50">
            auto_awesome
          </span>
          <h2 className="font-headline-lg text-headline-lg italic text-on-surface">
            El Manifiesto YIMA
          </h2>
          <p className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            No vendemos productos: elegimos piezas que valen la pena tener cerca.
            Cada cosa que entra al catálogo pasó antes por la misma pregunta que
            te hacemos a vos — ¿esto suma o solo ocupa lugar? Encontrá lo que
            buscabas, y de paso, algo que no sabías que te hacía falta.
          </p>
        </div>
        <div className="absolute -z-0 left-10 top-10 h-64 w-64 rounded-full bg-terracotta-warm/5 blur-3xl" />
        <div className="absolute -z-0 bottom-10 right-10 h-96 w-96 rounded-full bg-golden-sand/10 blur-3xl" />
      </section>

      <BotonWhatsapp contexto={{ tipo: "home" }} />
    </>
  );
}

export default Catalogo;
