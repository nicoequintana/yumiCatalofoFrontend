import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard.jsx";
import { MIN_DESTACADOS } from "../hooks/useDestacados.js";

/** Píxeles por segundo del desplazamiento automático. */
const VELOCIDAD_PX_POR_SEGUNDO = 40;

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
 * Velocidad a la que la inercia se apaga y retoma el desplazamiento
 * automático. Coincide a propósito con `VELOCIDAD_PX_POR_SEGUNDO`: el relevo
 * ocurre cuando las dos velocidades son iguales, así no hay ningún escalón
 * perceptible entre "todavía viene frenando" y "volvió a girar solo".
 */
const VELOCIDAD_FIN_INERCIA_PX_S = VELOCIDAD_PX_POR_SEGUNDO;

/**
 * Carrusel de productos destacados — "Hallazgos del día".
 *
 * **Por qué mueve `scrollLeft` y no una animación CSS.** La versión anterior
 * animaba un `translateX` con keyframes, y eso hace imposible el arrastre: el
 * `transform` de la animación y la posición que fija el gesto compiten por el
 * mismo elemento, así que la tarjeta salta de vuelta apenas se suelta. Con el
 * scroll nativo como único motor, el auto-movimiento y el arrastre escriben
 * la misma propiedad y se turnan sin pelearse — y de yapa el contenedor
 * queda scrolleable con rueda, trackpad y teclado sin código extra.
 *
 * **Loop sin costura**: la lista se renderiza dos veces. El segundo juego
 * empieza exactamente en la mitad del ancho scrolleable, así que al llegar
 * ahí se resta esa mitad y la vista queda idéntica: el rebobinado no se ve.
 * El duplicado es puramente visual: cada tarjeta clonada usa el mismo
 * `ProductCard` compartido con el resto del sitio (`RielOfertas.jsx`,
 * `/coleccion`, favoritos), envuelto en un DIV que lleva `aria-hidden="true"`
 * e `inert` — `ProductCard` no acepta una variante "decorativa" (solo recibe
 * `{ producto }`), así que sacar el clon del árbol de accesibilidad y del
 * tabulado es responsabilidad del envoltorio, no de la tarjeta.
 *
 * **Pausa**: solo al apuntar (o enfocar) UN ENVOLTORIO, y en móvil solo
 * mientras se mantiene presionada. No al pasar por la banda: ese era el
 * comportamiento anterior y dejaba el carrusel congelado con el puntero
 * quieto en cualquier hueco. Los handlers viven en el DIV que envuelve a cada
 * `ProductCard`, por el mismo motivo que el `aria-hidden`/`inert`: el
 * componente compartido no admite props propias.
 *
 * **`prefers-reduced-motion`**: sin movimiento automático; el carrusel queda
 * como una tira que se arrastra o scrollea a mano. El movimiento automático
 * infinito es justamente lo que esa preferencia existe para evitar.
 */
function CarruselDestacados({ productos }) {
  const destacados = productos.filter((p) => p.destacado);

  const pistaRef = useRef(null);
  const [pausado, setPausado] = useState(false);

  // Espejo de `pausado` para el bucle de animación.
  //
  // El bucle NO puede depender del estado directamente: tenerlo en las
  // dependencias del efecto reinicia el `requestAnimationFrame` en cada
  // hover, y leerlo desde el closure lo congela en el valor del render que
  // creó ese closure. Un ref se lee fresco en cada frame sin re-suscribir
  // nada.
  const pausadoRef = useRef(false);
  pausadoRef.current = pausado;

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

  const pausar = useCallback(() => setPausado(true), []);
  const reanudar = useCallback(() => setPausado(false), []);

  /** Si la sección se muestra. El early return va después de los hooks. */
  const hayCarrusel = destacados.length >= MIN_DESTACADOS;

  // Motor del desplazamiento automático.
  //
  // `requestAnimationFrame` con delta de tiempo real, no un incremento fijo
  // por frame: así la velocidad es la misma en una pantalla de 60 Hz que en
  // una de 120 Hz, y una pestaña en segundo plano (donde los frames se
  // espacian) no acumula un salto al volver.
  useEffect(() => {
    if (!hayCarrusel) return undefined;

    // Respeta la preferencia del sistema: sin movimiento automático, el
    // carrusel sigue siendo arrastrable y scrolleable a mano.
    const consultaMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (consultaMovimiento?.matches) return undefined;

    let frameId = 0;
    let ultimoTiempo = 0;

    // Posición exacta, en punto flotante, llevada aparte de `scrollLeft`.
    //
    // **Esto no es una optimización, es lo que hace que el carrusel avance.**
    // A 40 px/s con frames de ~9 ms, cada frame pide ~0,36 px, y el navegador
    // CUANTIZA la escritura de `scrollLeft` al píxel de dispositivo: medido
    // en Chromium, de 120 px pedidos en 3 s llegaban 24 (se perdía el 80 %).
    // Acumulando aparte y escribiendo el valor absoluto, la fracción nunca se
    // descarta — se arrastra al frame siguiente hasta completar un píxel.
    // Volver a `scrollLeft += …` reintroduce el bug.
    let posicion = null;

    function paso(tiempo) {
      const delta = ultimoTiempo ? (tiempo - ultimoTiempo) / 1000 : 0;
      ultimoTiempo = tiempo;

      // El ref se lee DENTRO del frame, no una vez al montar el efecto: en el
      // primer render `productos` todavía llega vacío, así que el `<div>` de
      // la pista no existe y una captura única se quedaría con `null` para
      // siempre. Ese fue exactamente el bug de "no gira solo".
      const pista = pistaRef.current;

      // La inercia manda sobre la pausa: es un movimiento que la persona
      // acaba de imprimir con el dedo y dura menos de un segundo. Frenarlo en
      // seco porque el puntero quedó encima de una tarjeta sería, otra vez,
      // el corte abrupto que esta rama existe para evitar.
      const hayInercia = inerciaRef.current !== 0;

      // Un frame de más entre el desmontaje y el `cancelAnimationFrame` no
      // debe explotar.
      if (pista && !arrastreRef.current.activo && (hayInercia || !pausadoRef.current)) {
        // Se resincroniza con el DOM cuando algo externo movió el scroll
        // (arrastre, rueda, teclado): si la posición propia se alejó del
        // scroll real, manda el real.
        if (posicion === null || Math.abs(posicion - pista.scrollLeft) > 1) {
          posicion = pista.scrollLeft;
        }

        if (hayInercia) {
          posicion += inerciaRef.current * delta;

          // El decaimiento se eleva al tiempo REAL transcurrido, no se aplica
          // una vez por frame: si no, el carrusel frenaría al doble de rápido
          // en una pantalla de 120 Hz que en una de 60.
          inerciaRef.current *= Math.pow(FRICCION_POR_FRAME, delta * 60);

          // Al caer a la velocidad del desplazamiento automático, se apaga y
          // el relevo es imperceptible: las dos velocidades son la misma.
          if (Math.abs(inerciaRef.current) < VELOCIDAD_FIN_INERCIA_PX_S) {
            inerciaRef.current = 0;
          }
        } else {
          posicion += VELOCIDAD_PX_POR_SEGUNDO * delta;
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
        // Mientras está pausado o el usuario arrastra, la posición propia
        // sigue al DOM en vez de quedar vieja y provocar un salto al soltar.
        posicion = pista.scrollLeft;
      }

      frameId = window.requestAnimationFrame(paso);
    }

    frameId = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(frameId);
    // `pausado` NO va acá: lo lee `pausadoRef` en cada frame. Ponerlo
    // reiniciaría el bucle en cada hover.
  }, [hayCarrusel]);

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

    // En móvil el gesto ES la pausa: se frena mientras el dedo está apoyado y
    // sigue al soltar, que es lo que se pidió. `onMouseEnter` no existe ahí.
    setPausado(true);
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
    setPausado(false);
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
        <div className="flex flex-col gap-2">
          <h2 className="font-headline-md text-headline-md text-on-surface">Hallazgos del día</h2>
          <p className="font-body-lg text-body-lg max-w-2xl text-on-surface-variant">
            Nuestra selección del momento — piezas destacadas que no vas a querer perderte.
          </p>
        </div>
      </div>

      {/* La pista va a ancho completo (fuera del contenedor centrado) para que
          las tarjetas entren y salgan por los bordes de la pantalla.

          `overflow-x-auto` es el motor: lo mueve tanto el bucle automático
          como el arrastre. `scrollbar-none` la oculta sin desactivar el
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
              className="w-[220px] shrink-0 md:w-[260px]"
              onMouseEnter={pausar}
              onMouseLeave={reanudar}
              onFocus={pausar}
              onBlur={reanudar}
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
              className="w-[220px] shrink-0 md:w-[260px]"
              onMouseEnter={pausar}
              onMouseLeave={reanudar}
              onFocus={pausar}
              onBlur={reanudar}
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
