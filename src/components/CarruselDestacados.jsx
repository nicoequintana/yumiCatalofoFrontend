import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BotonFavorito from "./BotonFavorito.jsx";
import { formatPrecio } from "../utils/formato.js";
import { MIN_DESTACADOS } from "../hooks/useDestacados.js";

/** Píxeles por segundo del desplazamiento automático. */
const VELOCIDAD_PX_POR_SEGUNDO = 40;

/** Movimiento del puntero, en píxeles, a partir del cual es un arrastre y no un click. */
const UMBRAL_ARRASTRE_PX = 5;

/**
 * Tarjeta de un producto destacado dentro del carrusel.
 *
 * Hereda el lenguaje visual del bento que reemplazó a este componente:
 * imagen full-bleed, gradiente de abajo hacia arriba para que el texto se lea
 * sobre cualquier foto, chip de etiqueta, nombre y precio.
 *
 * Ancho fijo y `shrink-0`: el track es un flex sin wrap, y una tarjeta que se
 * encoge rompería el cálculo del punto de rebobinado (la mitad exacta del
 * ancho scrolleable) del que depende el loop sin costura.
 *
 * `decorativa` marca las tarjetas del juego duplicado: se ocultan al lector
 * de pantalla y salen del orden de tabulación, porque son el mismo contenido
 * repetido para dar continuidad visual, no productos adicionales.
 *
 * `onPausar` / `onReanudar` se disparan sobre LA TARJETA, no sobre la banda
 * que la contiene: el usuario pidió que el carrusel se frene al apuntar una
 * card concreta. Cablearlo en el contenedor —que ocupa el ancho completo de
 * la pantalla, huecos incluidos— dejaba el carrusel congelado con solo tener
 * el puntero quieto en cualquier parte de la franja.
 */
function TarjetaDestacado({ producto, decorativa = false, onPausar, onReanudar, onClickCapture }) {
  const foto = producto.fotos?.[0];

  return (
    <Link
      to={`/producto/${producto.id}`}
      className="group relative h-[320px] w-[280px] shrink-0 overflow-hidden rounded-xl bg-surface-container md:h-[380px] md:w-[320px]"
      tabIndex={decorativa ? -1 : undefined}
      aria-hidden={decorativa ? "true" : undefined}
      onMouseEnter={onPausar}
      onMouseLeave={onReanudar}
      onFocus={onPausar}
      onBlur={onReanudar}
      onClickCapture={onClickCapture}
      // El arrastre se maneja con eventos de puntero en el contenedor; sin
      // esto el navegador inicia su propio drag de imagen/enlace y el gesto
      // se corta a la mitad.
      draggable={false}
    >
      {foto ? (
        <img
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={foto.url}
          alt={producto.nombre}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : null}
      {/* El gradiente se aliviana a /50: con el panel de vidrio debajo, el
          /80 anterior sumaba una segunda capa oscura y la foto quedaba
          apagada. Se conserva porque suaviza el borde superior del panel. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-inverse-surface/50 via-transparent to-transparent" />
      {/* El corazón se omite por completo en el juego duplicado, en vez de
          intentar sacarlo del tabulado: `BotonFavorito` no acepta `tabIndex`
          (su firma es `{ productoId, className, textoGuardar }`), así que
          pasárselo lo descartaría en silencio y el clon quedaría tabulable.
          Omitirlo además evita dos botones con el mismo `aria-label` para el
          mismo producto. */}
      {decorativa ? null : (
        <BotonFavorito
          productoId={producto.id}
          className="absolute right-2 top-2 z-10 rounded-full bg-surface-container-lowest/90 shadow-sm"
        />
      )}
      {/* Panel de vidrio esmerilado sobre la foto.
          
          `inset-x-0` y no `left-0`: el bloque se estiraba al ancho de su
          contenido, así que un panel con fondo propio quedaría como un
          recuadro irregular cortado a media tarjeta. Como banda al ancho
          completo se lee como una capa de la tarjeta, no como un parche.

          La mezcla es deliberada: el desenfoque —no la opacidad— hace el
          grueso del trabajo. El fondo del panel es a su vez un degradado
          (`/85` abajo → `/50` arriba) en lugar de un velo parejo: la parte
          baja, donde vive el precio, necesita más respaldo, mientras que el
          borde superior se funde con la foto en vez de cortarla con una
          línea dura. Va en negro puro (`black`), no en `inverse-surface`: con
          fotos muy claras el texto blanco seguía perdiendo contraste incluso
          con el degradado, así que hace falta el respaldo más oscuro posible
          debajo del blur.

          `backdrop-blur-md` y no `-xl`: el panel viaja a 40 px/s dentro del
          carrusel y el navegador recalcula el desenfoque en cada frame.
          `md` es el punto donde el texto ya se lee sin que el scroll pierda
          fluidez. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 border-t border-surface/20 bg-gradient-to-t from-black/85 to-black/50 px-5 pb-5 pt-4 backdrop-blur-md">
        {producto.etiqueta ? (
          /* Chip en blanco sobre vidrio, no en crema con texto oscuro.
             Dentro del panel esmerilado, el texto casi negro sobre
             `surface/70` se leía como un bloque gris apagado: pierde contra
             la foto y rompe la coherencia con el nombre y el precio, que ya
             son blancos. Acá es un borde claro translúcido con la misma
             tinta que el resto del bloque. */
          <span className="font-label-md text-label-md w-max rounded-full border border-surface/40 bg-surface/15 px-3 py-1 uppercase tracking-wide text-surface backdrop-blur-sm [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">
            {producto.etiqueta}
          </span>
        ) : null}
        {/* `line-clamp-2`: un nombre largo empujaba el precio fuera de la
            tarjeta. */}
        <h3 className="font-body-lg text-[19px] font-semibold leading-snug tracking-[-0.01em] text-surface line-clamp-2 [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
          {producto.nombre}
        </h3>
        {/* El precio es lo que la gente busca primero: gana peso y tamaño
            para que el ojo lo encuentre sin leer el nombre entero. */}
        <span className="font-body-lg text-[22px] font-bold leading-none tracking-[-0.01em] text-surface [text-shadow:0_2px_4px_rgb(0_0_0/0.55)]">
          {formatPrecio(producto.precio)}
        </span>
      </div>
    </Link>
  );
}

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
 * El duplicado es puramente visual (ver `decorativa` en `TarjetaDestacado`).
 *
 * **Pausa**: solo al apuntar (o enfocar) UNA TARJETA, y en móvil solo
 * mientras se mantiene presionada. No al pasar por la banda: ese era el
 * comportamiento anterior y dejaba el carrusel congelado con el puntero
 * quieto en cualquier hueco.
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
  const arrastreRef = useRef({ activo: false, xInicial: 0, scrollInicial: 0, movido: false });

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

      // Un frame de más entre el desmontaje y el `cancelAnimationFrame` no
      // debe explotar.
      if (pista && !pausadoRef.current && !arrastreRef.current.activo) {
        // Se resincroniza con el DOM cuando algo externo movió el scroll
        // (arrastre, rueda, teclado): si la posición propia se alejó del
        // scroll real, manda el real.
        if (posicion === null || Math.abs(posicion - pista.scrollLeft) > 1) {
          posicion = pista.scrollLeft;
        }

        posicion += VELOCIDAD_PX_POR_SEGUNDO * delta;

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

    arrastreRef.current = {
      activo: true,
      xInicial: evento.clientX,
      scrollInicial: pista.scrollLeft,
      movido: false,
      pointerId: evento.pointerId,
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
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pt-16 md:px-margin-desktop md:pt-24">
        <div className="mb-12 flex flex-col gap-2">
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
        className="w-full cursor-grab overflow-x-auto overscroll-x-contain pb-16 [scrollbar-width:none] active:cursor-grabbing md:pb-24 [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
      >
        <div className="flex w-max gap-gutter px-margin-mobile md:px-margin-desktop">
          {destacados.map((producto) => (
            <TarjetaDestacado
              key={producto.id}
              producto={producto}
              onPausar={pausar}
              onReanudar={reanudar}
              onClickCapture={handleClickCapture}
            />
          ))}
          {destacados.map((producto) => (
            <TarjetaDestacado
              key={`clon-${producto.id}`}
              producto={producto}
              decorativa
              onPausar={pausar}
              onReanudar={reanudar}
              onClickCapture={handleClickCapture}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CarruselDestacados;
