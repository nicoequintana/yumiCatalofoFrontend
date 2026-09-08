import { useCallback, useEffect, useRef, useState } from "react";
import { registrarEventoComercial } from "../api/campanias.js";
import SlideCampania from "./SlideCampania.jsx";

/**
 * La identidad de un slide, **única entre campañas y promociones**.
 *
 * ⚠️ NO alcanza con `promocionId ?? campaniaId`: una campaña con id 3 y una
 * promoción con id 3 caen las dos en `3`. Son dos secuencias de identidad
 * distintas —cada tabla tiene su propio `IDENTITY`—, así que el choque no es
 * raro, es lo normal en una base joven. Con la `key` repetida React puede
 * reusar DOM y estado entre dos slides distintos cuando la lista cambia.
 *
 * El formato `TIPO:id` es el mismo que usa `repartirEtapas` en el backend
 * (`lib/metricasComerciales.js`) para exactamente el mismo problema.
 */
export function claveDeSlide(slide) {
  return `${slide.tipo}:${slide.promocionId ?? slide.campaniaId ?? "sin-id"}`;
}

/**
 * El carrusel de campañas y ofertas de la home.
 *
 * REEMPLAZA A `BannerCampania`, que mostraba UNA campaña elegida por prioridad.
 * Existe por lo mismo que existía aquel: el cartel modal se cierra, y sin una
 * superficie permanente el destino de la campaña se perdía. Lo que cambia es
 * que ahora entran varias, y una de ellas la arma el sistema (las ofertas).
 *
 * **Contenido, no a sangre.** MercadoLibre puede ir de pared a pared porque
 * cada slide suyo es una ilustración terminada; acá el arte es OPCIONAL, y una
 * banda de 400 px de color plano a todo el ancho se lee como un error de carga.
 *
 * **La rotación automática no es decorativa**: en móvil casi nadie desliza un
 * banner, así que sin ella el slide de Ofertas —que es la mitad de por qué
 * existe esto— no lo ve prácticamente nadie.
 */

/** Cada cuánto pasa al siguiente. */
const INTERVALO_MS = 5000;

export default function CarruselCampanias({ slides = [] }) {
  const [indice, setIndice] = useState(0);
  const [frenado, setFrenado] = useState(false);
  const temporizador = useRef(null);
  // Los slides ya impresos en ESTE montaje. Si el carrusel rota y vuelve, no se
  // cuenta de nuevo: la impresión mide que lo vio, no cuántas vueltas dio.
  const impresos = useRef(new Set());

  const total = slides.length;
  // Con menos de dos no hay nada que rotar ni a dónde ir: es un banner.
  const hayControles = total > 1;

  const mover = useCallback(
    (delta) => {
      // Circular en los DOS sentidos: desde el primero, "anterior" va al
      // último. Deshabilitar el control en las puntas obliga a mirar si
      // todavía sirve antes de tocarlo.
      setIndice((actual) => (actual + (delta % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    // El índice puede quedar fuera de rango si la lista se acorta entre dos
    // cargas (una campaña que terminó). Sin esto, el carrusel se queda en un
    // slide que ya no existe y no pinta nada.
    if (indice >= total && total > 0) setIndice(0);
  }, [indice, total]);

  useEffect(() => {
    // "Se ve de verdad" es "es el slide que el carrusel muestra", una sola vez
    // por slide por montaje. Sin `IntersectionObserver`: el carrusel vive al
    // tope de la home, visible al cargar, y este proyecto descarta
    // observadores de viewport a propósito.
    const slide = slides[indice];
    if (!slide) return;

    const clave = claveDeSlide(slide);
    if (impresos.current.has(clave)) return;
    impresos.current.add(clave);

    registrarEventoComercial({
      tipo: "IMPRESION_COMERCIAL",
      origen: "BANNER",
      campaniaId: slide.campaniaId ?? null,
      promocionId: slide.promocionId ?? null,
    });
    // `slides` va en las dependencias, pero el `Set` es la guarda real: si el
    // padre recrea el array en cada render, el efecto corre de nuevo y no pasa
    // nada, porque la clave ya está adentro.
  }, [indice, slides]);

  useEffect(() => {
    if (!hayControles || frenado) return undefined;

    // El movimiento automático infinito es justamente lo que esta preferencia
    // existe para evitar.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    temporizador.current = setInterval(() => {
      setIndice((actual) => (actual + 1) % total);
    }, INTERVALO_MS);

    return () => clearInterval(temporizador.current);
    // `indice` está en las dependencias A PROPÓSITO: es lo que hace que
    // cualquier control REINICIE la cuenta. Sin él, adelantar a mano y que el
    // salto automático llegue 200 ms después te saca de la pantalla lo que
    // fuiste a buscar.
  }, [hayControles, frenado, total, indice]);

  if (total === 0) return null;

  return (
    <section
      aria-label="Campañas y ofertas"
      className="mx-auto w-full max-w-container-max px-margin-mobile pt-6 md:px-margin-desktop"
      // Se frena al tocar y al entrar con el teclado, y vuelve al salir.
      onPointerEnter={() => setFrenado(true)}
      onPointerLeave={() => setFrenado(false)}
      onFocus={() => setFrenado(true)}
      onBlur={() => setFrenado(false)}
      onKeyDown={(evento) => {
        if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
        evento.preventDefault();
        mover(evento.key === "ArrowRight" ? 1 : -1);
      }}
    >
      {/* Los dos ratios salen de medir la home de MercadoLibre a 412 y a 1440.
          El arte de una campaña tiene que sobrevivir a los dos recortes, y por
          eso la zona segura del copy es el tercio izquierdo. */}
      <div
        aria-roledescription="carrusel"
        className="relative aspect-[2.9/1] w-full overflow-hidden rounded-xl md:aspect-[3.6/1]"
      >
        {slides.map((slide, i) => (
          <div
            // Ver `claveDeSlide` arriba: una campaña y una promoción pueden
            // compartir id numérico (son dos `IDENTITY` distintos), así que
            // `promocionId ?? campaniaId` a secas colisiona. El prefijo
            // `tipo:` es lo que las separa.
            key={claveDeSlide(slide)}
            aria-hidden={i === indice ? undefined : "true"}
            // `inert` saca del tabulado los slides ocultos, booleano — no
            // string — porque React lo trata como atributo booleano de
            // primera clase, igual que `disabled` o `hidden`.
            //
            // jsdom y Testing Library NO lo implementan: `getByRole` sigue
            // encontrando botones y links dentro de un subárbol inerte, así
            // que el test de abajo verifica el ATRIBUTO en el DOM, nunca la
            // conducta (que un click no navegue, que Tab lo salte). Esa
            // conducta real se confirma en navegador, mismo criterio que el
            // resto del repo con este gotcha.
            inert={i !== indice}
            className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
              i === indice ? "opacity-100" : "opacity-0"
            }`}
          >
            <SlideCampania slide={slide} />
          </div>
        ))}
      </div>

      {/* La fila de control va DEBAJO, no superpuesta. A 135 px de alto en
          móvil una flecha encima tapa el doodle o el título, y con arte caería
          justo sobre la zona segura del copy. */}
      {hayControles ? (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label="Slide anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              chevron_left
            </span>
          </button>

          <div role="tablist" aria-label="Ir a un slide" className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                // Misma clave que el slide, ver comentario arriba.
                key={claveDeSlide(slide)}
                type="button"
                role="tab"
                onClick={() => setIndice(i)}
                aria-current={i === indice ? "true" : "false"}
                aria-label={`Ir al slide ${i + 1} de ${total}`}
                className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  i === indice ? "w-5 bg-primary" : "w-1.5 bg-outline-variant"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => mover(1)}
            aria-label="Slide siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              chevron_right
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
