import { useEffect, useRef } from "react";
import ProductCard from "./ProductCard.jsx";
import { MIN_DESTACADOS } from "../hooks/useDestacados.js";

/** Cuántas tarjetas avanza o retrocede cada flecha. */
const TARJETAS_POR_FLECHA = 3;

/** Movimiento del puntero, en píxeles, a partir del cual es un arrastre y no un click. */
const UMBRAL_ARRASTRE_PX = 5;

/**
 * Velocidad mínima del gesto, en px/s, para que soltar deje al carrusel en
 * movimiento. Por debajo de esto el gesto fue una colocación deliberada —
 * arrastrar despacio hasta una tarjeta y soltar— y continuar el viaje sería
 * llevarse puesto lo que la persona acaba de elegir mirar.
 */
const VELOCIDAD_MINIMA_INERCIA_PX_S = 120;

/**
 * Cuánta velocidad sobrevive a cada frame de 60 Hz. Se aplica elevado al
 * tiempo real transcurrido, así el frenado dura lo mismo a 60 que a 120 Hz.
 */
const FRICCION_POR_FRAME = 0.94;

/**
 * Velocidad, en px/s, por debajo de la cual la inercia se apaga. Es el mismo
 * valor que tenía el viejo desplazamiento automático (40 px/s): a esa
 * velocidad el frenado ya no se percibe como movimiento propio del gesto.
 */
const VELOCIDAD_FIN_INERCIA_PX_S = 40;

/**
 * Carrusel de productos destacados — "Hallazgos del día".
 *
 * **Sin autoplay** (spec del rediseño, §3 Destacados): avanza solo con las
 * flechas (escritorio) o deslizando. Hasta el 13/09/2026 giraba solo a
 * 40 px/s; ese motor se sacó y quedó únicamente la inercia post-arrastre.
 *
 * **Por qué mueve `scrollLeft` y no una animación CSS.** Una animación de
 * `translateX` y la posición que fija el gesto compiten por el mismo
 * `transform`, así que la tarjeta salta de vuelta apenas se suelta. Con el
 * scroll nativo como único motor, arrastre, inercia y flechas escriben la
 * misma propiedad — y el contenedor queda scrolleable con rueda, trackpad y
 * teclado sin código extra.
 *
 * **Loop sin costura**: la lista se renderiza dos veces. El segundo juego
 * empieza exactamente en la mitad del ancho scrolleable, así que al llegar
 * ahí se resta esa mitad y la vista queda idéntica: el rebobinado no se ve.
 * El duplicado es puramente visual: cada tarjeta clonada usa el mismo
 * `ProductCard` compartido con el resto del sitio (`RielOfertas.jsx`,
 * `/coleccion`, favoritos), envuelto en un DIV que lleva `aria-hidden="true"`
 * e `inert` — `ProductCard` no acepta una variante "decorativa" (solo recibe
 * `{ producto }`), así que sacar el clon del árbol de accesibilidad y del
 * tabulado es responsabilidad del envoltorio, no de la tarjeta. Eso incluye
 * sus botones Agregar y favorito.
 *
 * **`prefers-reduced-motion`**: sin inercia y con flechas que saltan en vez
 * de deslizar; la tira sigue arrastrable y scrolleable a mano.
 */
function CarruselDestacados({ productos }) {
  const destacados = productos.filter((p) => p.destacado);

  const pistaRef = useRef(null);

  // Estado del gesto de arrastre. En un ref y no en `useState`: cambia en
  // cada `pointermove` y no debe provocar un render por frame.
  const arrastreRef = useRef({
    activo: false,
    xInicial: 0,
    scrollInicial: 0,
    movido: false,
    // Velocidad del DEDO en px/s (positiva hacia la derecha), suavizada entre
    // movimientos. El scroll va al revés que el dedo, así que al soltar se
    // invierte el signo.
    velocidad: 0,
    xUltimo: 0,
    tiempoUltimo: 0,
  });

  // Velocidad remanente del scroll, en px/s, mientras el carrusel viene
  // frenando después de soltar. Cero significa que no hay inercia en curso.
  const inerciaRef = useRef(0);

  /** Si la sección se muestra. El early return va después de los hooks. */
  const hayCarrusel = destacados.length >= MIN_DESTACADOS;

  // Motor de la inercia post-arrastre (el único movimiento que el carrusel
  // hace sin un gesto en curso; no hay autoplay).
  //
  // `requestAnimationFrame` con delta de tiempo real, no un incremento fijo
  // por frame: así el frenado dura lo mismo en una pantalla de 60 Hz que en
  // una de 120 Hz, y una pestaña en segundo plano no acumula un salto.
  useEffect(() => {
    if (!hayCarrusel) return undefined;

    // Respeta la preferencia del sistema: sin inercia, el carrusel sigue
    // siendo arrastrable y scrolleable a mano.
    const consultaMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (consultaMovimiento?.matches) return undefined;

    let frameId = 0;
    let ultimoTiempo = 0;

    // Posición exacta, en punto flotante, llevada aparte de `scrollLeft`: el
    // navegador CUANTIZA la escritura de `scrollLeft` al píxel de dispositivo
    // (medido en Chromium: de 120 px pedidos en pasos sub-píxel llegaban 24).
    // Acumulando aparte y escribiendo el valor absoluto, la fracción nunca se
    // descarta. Volver a `scrollLeft += …` reintroduce el bug.
    let posicion = null;

    function paso(tiempo) {
      const delta = ultimoTiempo ? (tiempo - ultimoTiempo) / 1000 : 0;
      ultimoTiempo = tiempo;

      // El ref se lee DENTRO del frame, no una vez al montar el efecto: en el
      // primer render `productos` todavía llega vacío, así que el `<div>` de
      // la pista no existe y una captura única se quedaría con `null`.
      const pista = pistaRef.current;

      // Un frame de más entre el desmontaje y el `cancelAnimationFrame` no
      // debe explotar.
      if (pista && !arrastreRef.current.activo && inerciaRef.current !== 0) {
        // Se resincroniza con el DOM cuando algo externo movió el scroll
        // (arrastre, rueda, teclado, flechas): manda el real.
        if (posicion === null || Math.abs(posicion - pista.scrollLeft) > 1) {
          posicion = pista.scrollLeft;
        }

        posicion += inerciaRef.current * delta;

        // El decaimiento se eleva al tiempo REAL transcurrido, no se aplica
        // una vez por frame: si no, el carrusel frenaría al doble de rápido
        // en una pantalla de 120 Hz que en una de 60.
        inerciaRef.current *= Math.pow(FRICCION_POR_FRAME, delta * 60);
        if (Math.abs(inerciaRef.current) < VELOCIDAD_FIN_INERCIA_PX_S) {
          inerciaRef.current = 0;
        }

        // Rebobinado en las DOS direcciones: arrastrar hacia la derecha lleva
        // el scroll hacia 0, y sin la rama de abajo el carrusel se clavaba
        // contra el borde izquierdo en vez de seguir siendo infinito.
        const mitad = pista.scrollWidth / 2;
        if (mitad > 0) {
          if (posicion >= mitad) posicion -= mitad;
          else if (posicion < 0) posicion += mitad;
        }

        pista.scrollLeft = posicion;
      } else if (pista) {
        // Sin inercia en curso la posición propia sigue al DOM, así no queda
        // vieja y no provoca un salto cuando arranque la próxima.
        posicion = pista.scrollLeft;
      }

      frameId = window.requestAnimationFrame(paso);
    }

    frameId = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(frameId);
  }, [hayCarrusel]);

  /**
   * Flechas de escritorio: desplazan una tanda de `TARJETAS_POR_FLECHA`.
   *
   * `scrollLeft` está clampeado a `[0, scrollWidth - clientWidth]`, así que
   * antes de un desplazamiento que cruzaría la costura se salta a la copia
   * equivalente (vista idéntica, mismo truco que el arrastre). Sin eso,
   * "Anteriores" no haría nada en el primer uso: la pista arranca en 0.
   */
  function desplazarTanda(direccion) {
    const pista = pistaRef.current;
    if (!pista) return;

    // Una flecha es un gesto nuevo: corta la inercia que venía, igual que
    // volver a apoyar el dedo.
    inerciaRef.current = 0;

    // Ancho de tarjeta MÁS el hueco entre tarjetas: sin el `gap`, cada click
    // se quedaría corto 3 × 24 px y la tanda iría corriéndose de a poco.
    const tarjeta = pista.querySelector("[data-tarjeta-carrusel]");
    if (!tarjeta) return;
    const hueco = parseFloat(window.getComputedStyle(tarjeta.parentElement).columnGap) || 0;
    const desplazamiento = direccion * (tarjeta.offsetWidth + hueco) * TARJETAS_POR_FLECHA;

    const mitad = pista.scrollWidth / 2;
    const destino = pista.scrollLeft + desplazamiento;
    if (mitad > 0) {
      if (destino < 0) pista.scrollLeft += mitad;
      else if (destino >= mitad) pista.scrollLeft -= mitad;
    }

    const sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    pista.scrollBy({ left: desplazamiento, behavior: sinMovimiento ? "auto" : "smooth" });
  }

  function handlePointerDown(evento) {
    // Solo botón principal del mouse; en touch/pen `button` también es 0.
    if (evento.button !== 0) return;
    const pista = pistaRef.current;
    if (!pista) return;

    // Volver a apoyar el dedo agarra el carrusel donde está. Sin esto seguiría
    // viajando por debajo del dedo, que es la sensación de que el control se
    // le escapa a uno de las manos.
    inerciaRef.current = 0;

    arrastreRef.current = {
      activo: true,
      xInicial: evento.clientX,
      scrollInicial: pista.scrollLeft,
      movido: false,
      pointerId: evento.pointerId,
      velocidad: 0,
      xUltimo: evento.clientX,
      tiempoUltimo: performance.now(),
    };

    // NO se llama a `setPointerCapture` acá: medido en Chromium, capturar el
    // puntero en `pointerdown` deja el `<a>` sin su click nativo y las
    // tarjetas dejan de abrir la ficha del producto. Los `pointermove`
    // llegan igual porque los escucha el contenedor y el gesto ocurre dentro
    // de él; la captura se toma recién cuando el movimiento supera el umbral
    // y ya sabemos que es un arrastre y no un tap (ver `handlePointerMove`).
  }

  function handlePointerMove(evento) {
    const arrastre = arrastreRef.current;
    if (!arrastre.activo) return;
    const pista = pistaRef.current;
    if (!pista) return;

    const desplazamiento = evento.clientX - arrastre.xInicial;
    if (!arrastre.movido && Math.abs(desplazamiento) > UMBRAL_ARRASTRE_PX) {
      arrastre.movido = true;
      // Recién acá: pasado el umbral el gesto ya no puede ser un tap, así que
      // capturar el puntero no le quita el click a ninguna tarjeta. Lo que sí
      // da es que el arrastre sobreviva si el dedo se sale de la pista.
      pista.setPointerCapture?.(evento.pointerId);
    }

    // Por debajo del umbral el gesto todavía puede ser un tap: no se mueve
    // nada, para que un temblor del dedo no desplace el carrusel.
    if (!arrastre.movido) return;

    // Velocidad del dedo, suavizada. Se mide entre movimientos consecutivos y
    // no contra el inicio del gesto: lo que decide la inercia es a qué
    // velocidad venía la mano AL SOLTAR, no el promedio de todo el recorrido
    // —un arrastre largo que se frena antes de levantar el dedo tiene que
    // quedarse quieto—. La mezcla 60/40 evita que un único movimiento
    // anómalo (un salto de muestreo, un rebote del dedo) mande solo.
    const ahora = performance.now();
    const dt = ahora - arrastre.tiempoUltimo;
    if (dt > 0) {
      const instantanea = ((evento.clientX - arrastre.xUltimo) / dt) * 1000;
      arrastre.velocidad = arrastre.velocidad * 0.6 + instantanea * 0.4;
      arrastre.xUltimo = evento.clientX;
      arrastre.tiempoUltimo = ahora;
    }

    // Sin este `preventDefault`, `touch-action: pan-y` deja pasar cualquier
    // ambigüedad de la primera detección de gesto en algunos navegadores
    // móviles: el sistema intenta aplicar SU propia física de scroll/rebote
    // sobre el mismo `overflow-x-auto` a la vez que este handler escribe
    // `scrollLeft` a mano, y las dos escrituras compitiendo es lo que se veía
    // como el carrusel trabándose o saltando de golpe al soltar. Una vez que
    // el gesto es un arrastre confirmado (pasado el umbral), el navegador ya
    // no debe tocar el scroll — nosotros lo manejamos por completo.
    if (evento.cancelable) evento.preventDefault();

    // El destino se normaliza ANTES de escribirlo, no después.
    //
    // `scrollLeft` está clampeado a [0, scrollWidth - clientWidth]: escribir
    // un valor negativo lo deja en 0 y el excedente se pierde, así que
    // corregir después ya no alcanza — el carrusel se clavaba contra el borde
    // izquierdo al arrastrar hacia la derecha. Envolviendo el número primero,
    // el recorrido es infinito en las DOS direcciones.
    const mitad = pista.scrollWidth / 2;
    let destino = arrastre.scrollInicial - desplazamiento;

    if (mitad > 0) {
      // `%` deja el resto con el signo del dividendo, así que un destino
      // negativo necesita la suma extra para caer dentro de [0, mitad).
      destino %= mitad;
      if (destino < 0) destino += mitad;

      // Reancla el gesto en la posición ya envuelta: sin esto, el próximo
      // `pointermove` vuelve a partir del `scrollInicial` original y el
      // carrusel salta de vuelta al cruzar la costura.
      arrastre.scrollInicial = destino + desplazamiento;
    }

    pista.scrollLeft = destino;
  }

  function terminarArrastre(evento) {
    const arrastre = arrastreRef.current;
    if (!arrastre.activo) return;

    const pista = pistaRef.current;
    if (pista?.hasPointerCapture?.(evento.pointerId)) {
      pista.releasePointerCapture(evento.pointerId);
    }

    // El scroll se mueve al revés que el dedo, de ahí el signo invertido.
    // Solo un gesto que venía rápido deja al carrusel en movimiento; soltar
    // despacio lo deja donde está.
    const velocidadScroll = -arrastre.velocidad;
    inerciaRef.current =
      arrastre.movido && Math.abs(velocidadScroll) >= VELOCIDAD_MINIMA_INERCIA_PX_S
        ? velocidadScroll
        : 0;

    arrastre.activo = false;
    // `movido` NO se limpia acá: lo lee el `onClickCapture` de la tarjeta,
    // que corre inmediatamente después de soltar. Se limpia ahí.
  }

  /**
   * Cancela la navegación cuando el "click" fue en realidad el final de un
   * arrastre. Sin esto, soltar el dedo sobre una tarjeta después de girar el
   * carrusel abre el producto, que es el modo de falla clásico de este patrón.
   */
  function handleClickCapture(evento) {
    if (arrastreRef.current.movido) {
      evento.preventDefault();
      evento.stopPropagation();
    }
    arrastreRef.current.movido = false;
  }

  if (!hayCarrusel) return null;

  return (
    <section className="w-full bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pt-12 md:px-margin-desktop md:pt-16">
        {/* Sin margen inferior: el aire hasta las tarjetas lo pone ahora el
            `py-8` de la pista, que entró para que el anillo de los destacados
            no se corte. Con los dos, el encabezado quedaba desprendido. */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">Hallazgos del día</h2>
            <p className="font-body-lg text-body-lg max-w-2xl text-on-surface-variant">
              Nuestra selección del momento — piezas destacadas que no vas a querer perderte.
            </p>
          </div>
          {/* Solo escritorio (mockup `.flechas`): en mobile deslizar alcanza. */}
          <div className="hidden shrink-0 gap-2 md:flex">
            <button
              type="button"
              aria-label="Anteriores"
              onClick={() => desplazarTanda(-1)}
              className="grid h-10 w-10 place-items-center rounded-full border border-outline-variant bg-surface-container-lowest text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              aria-label="Siguientes"
              onClick={() => desplazarTanda(1)}
              className="grid h-10 w-10 place-items-center rounded-full border border-outline-variant bg-surface-container-lowest text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* La pista va a ancho completo (fuera del contenedor centrado) para que
          las tarjetas entren y salgan por los bordes de la pantalla.

          `overflow-x-auto` es el motor: lo mueven el arrastre, la inercia y
          las flechas. `scrollbar-none` la oculta sin desactivar el
          scroll. `touch-action: pan-y` deja que el gesto horizontal lo maneje
          el componente y el vertical siga haciendo scroll de la página —
          sin eso, arrastrar de costado sobre el carrusel secuestra el scroll
          vertical del celular. */}
      <div
        ref={pistaRef}
        role="region"
        aria-label="Productos destacados"
        // `py-8` y no solo `pb-*`: `overflow-x-auto` obliga al navegador a
        // calcular `overflow-y: auto`, así que este contenedor RECORTA también
        // en vertical. Sin padding arriba, el anillo que `ProductCard` le pone
        // a los destacados (`ring-2`, que dibuja fuera de la caja) se corta
        // justo en el borde superior: se veía a los costados y abajo, y no
        // arriba.
        className="w-full cursor-grab overflow-x-auto overscroll-x-contain py-8 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
      >
        <div className="flex w-max gap-gutter px-margin-mobile md:px-margin-desktop">
          {destacados.map((producto) => (
            <div
              key={producto.id}
              data-tarjeta-carrusel
              className="w-[220px] shrink-0 md:w-[260px]"
              onClickCapture={handleClickCapture}
            >
              <ProductCard producto={producto} />
            </div>
          ))}
          {destacados.map((producto) => (
            <div
              key={`clon-${producto.id}`}
              aria-hidden="true"
              // Booleano, no string: en React 19 `inert` es un atributo
              // booleano de primera clase (mismo criterio que
              // `CarruselCampanias.jsx`) — pasarlo como texto dispara un
              // warning.
              inert={true}
              data-tarjeta-carrusel
              className="w-[220px] shrink-0 md:w-[260px]"
              onClickCapture={handleClickCapture}
            >
              <ProductCard producto={producto} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CarruselDestacados;
