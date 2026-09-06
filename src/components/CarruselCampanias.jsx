import { useCallback, useEffect, useRef, useState } from "react";
import SlideCampania from "./SlideCampania.jsx";

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
            // `promocionId` primero: un slide PROMOCION viaja con
            // `campaniaId: null`, así que caer directo a `campaniaId` colisiona
            // "PROMOCION" entre todos ellos. `tipo` queda de último recurso:
            // hoy todos los slides traen uno de los dos ids —el sintético
            // OFERTAS, que era el único sin ninguno, se eliminó el
            // 06/09/2026— pero se deja como red por si vuelve a existir un
            // slide sin identidad propia.
            key={slide.promocionId ?? slide.campaniaId ?? slide.tipo}
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
                // Mismo orden que la key del slide, ver comentario arriba.
                key={slide.promocionId ?? slide.campaniaId ?? slide.tipo}
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
