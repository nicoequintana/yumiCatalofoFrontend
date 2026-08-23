import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAnuncios } from "../api/anuncios.js";

/**
 * Velocidad del desfile, en píxeles por segundo.
 *
 * La duración de la animación NO es fija: se calcula como `distancia /
 * velocidad`. Con una duración fija, sumar un mensaje alargaría la pista y el
 * texto pasaría más rápido — la cinta cambiaría de ritmo sola cada vez que
 * alguien edita el copy. Fijando la velocidad, el ritmo de lectura es siempre el
 * mismo.
 */
const VELOCIDAD_PX_S = 55;

/** Un pase completo de los mensajes, con su ícono por ítem. */
function GrupoMensajes({ anuncios, decorativo, innerRef }) {
  return (
    <div
      ref={innerRef}
      aria-hidden={decorativo ? "true" : undefined}
      className="flex shrink-0 items-center"
    >
      {anuncios.map((anuncio) => (
        <span key={anuncio.id} className="flex shrink-0 items-center gap-2 px-6">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">
            redeem
          </span>
          {anuncio.texto}
        </span>
      ))}
    </div>
  );
}

/**
 * Cinta de anuncios sobre el navbar: los mensajes desfilan de derecha a
 * izquierda, en bucle continuo.
 *
 * **No es sticky, a propósito**: scrollea y se va. El único elemento pegado al
 * tope sigue siendo el `<header>` de `Navbar`, así que la cinta no le come alto
 * permanente a la ventana.
 *
 * **Se oculta en el panel admin.** `/catalogo/admin/login` se renderiza dentro
 * del mismo `Layout` que el catálogo público, así que sin este guard la cinta
 * de marketing aparecería sobre la pantalla de login. Mismo criterio (y misma
 * condición) que usa `Navbar` para esconder carrito y favoritos.
 *
 * Cinco cosas que romperlas no da error, solo un resultado peor:
 *
 * 1. **El grupo se repite hasta cubrir DOS veces el ancho de la barra**, y la
 *    animación desplaza media pista (`-50%`). No alcanza con duplicarlo: dos
 *    copias solo llenan la pantalla si UN grupo ya la llena, y con pocos
 *    anuncios la pista queda más angosta que la barra — se ve un hueco fijo a la
 *    derecha que nunca se completa. Ver `repeticiones`.
 * 2. **Solo el primer grupo se lee**: los demás van con `aria-hidden`. Un lector
 *    de pantalla tiene que escuchar cada anuncio UNA vez, no tantas como copias
 *    haya hecho falta para llenar el ancho.
 * 3. **Acá sí conviene una animación CSS**, al revés que en `CarruselDestacados`.
 *    Ahí el motor es `scrollLeft` porque el arrastre del usuario y la animación
 *    se pelearían por el mismo `transform`; en esta cinta no hay gesto que
 *    compita, y el compositor mueve la pista sin trabajo del hilo principal.
 * 4. **La medición necesita el ancho del CONTENEDOR, no solo el del grupo.** Es
 *    lo que decide cuántas repeticiones hacen falta, y cambia con el tamaño de
 *    la ventana — por eso el observer mira los dos.
 * 5. **`prefers-reduced-motion` apaga el desfile** y deja la cinta como texto
 *    quieto y scrolleable a mano. Texto en movimiento perpetuo que no se puede
 *    detener es exactamente el patrón que esa preferencia existe para desactivar
 *    — y, a diferencia del carrusel, acá el contenido es TEXTO: para quien
 *    necesita esa preferencia, leerlo en movimiento no es incómodo, es
 *    imposible.
 */
function BarraAnuncios() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");

  const contenedorRef = useRef(null);
  const grupoRef = useRef(null);
  const [anuncios, setAnuncios] = useState([]);
  const [medidas, setMedidas] = useState(null);
  const [animar, setAnimar] = useState(true);

  /**
   * Los mensajes salen de la tabla `Anuncio`, editable desde Configuración ›
   * Anuncios. Antes eran una constante en este archivo, así que cambiar el copy
   * exigía un deploy del frontend.
   *
   * **Un error de carga se traga en silencio, a propósito.** Es la excepción
   * consciente a la regla del proyecto de distinguir "falló la carga" de "no hay
   * nada": esa regla existe para las pantallas que venden —`/coleccion` no puede
   * decirle a un visitante que no hay productos cuando lo que falló es la red—.
   * Acá el componente es una cinta decorativa sobre el catálogo: un cartel de
   * error permanente arriba de todo el sitio es peor que no mostrar la cinta.
   * El backend sí registra el fallo.
   */
  useEffect(() => {
    if (esAdmin) return undefined;

    let activo = true;
    getAnuncios()
      .then((data) => {
        if (activo && Array.isArray(data)) setAnuncios(data);
      })
      .catch(() => {
        if (activo) setAnuncios([]);
      });

    return () => {
      activo = false;
    };
  }, [esAdmin]);

  useEffect(() => {
    // Mismo guard que `CarruselDestacados`: `matchMedia` puede no existir en el
    // entorno de tests, y el encadenamiento opcional degrada a "sin preferencia
    // declarada" en vez de romper el render.
    const consulta = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (consulta?.matches) setAnimar(false);
  }, []);

  /**
   * Calcula cuántas veces repetir el grupo y cuánto dura una vuelta.
   *
   * `repeticiones` es cuántos grupos hacen falta para cubrir el ancho visible.
   * La pista renderiza el doble (`repeticiones * 2`) y se desplaza `-50%`: al
   * terminar, la segunda mitad ocupa exactamente el lugar que tenía la primera y
   * la vista queda idéntica, así que el reinicio no se ve.
   *
   * La distancia recorrida es media pista —`repeticiones * anchoGrupo`—, y de
   * ahí sale la duración a velocidad constante.
   */
  const medir = useCallback(() => {
    const anchoGrupo = grupoRef.current?.offsetWidth ?? 0;
    const anchoContenedor = contenedorRef.current?.offsetWidth ?? 0;
    if (anchoGrupo <= 0 || anchoContenedor <= 0) return;

    const repeticiones = Math.max(1, Math.ceil(anchoContenedor / anchoGrupo));
    setMedidas({ repeticiones, duracionS: (repeticiones * anchoGrupo) / VELOCIDAD_PX_S });
  }, []);

  // `useLayoutEffect` y no `useEffect`: mide antes del primer pintado, así la
  // cinta no arranca un instante con la duración por defecto del navegador.
  useLayoutEffect(() => {
    if (esAdmin || anuncios.length === 0) return undefined;
    medir();

    // Se observan los DOS elementos, y cada uno por su motivo. El grupo: su
    // ancho depende de la tipografía, y hasta que Plus Jakarta Sans termina de
    // cargar el texto se mide con la fuente de reserva. El contenedor: su ancho
    // es el de la ventana, y al achicarla hacen falta menos repeticiones (al
    // agrandarla, más).
    const observer = new ResizeObserver(medir);
    if (grupoRef.current) observer.observe(grupoRef.current);
    if (contenedorRef.current) observer.observe(contenedorRef.current);
    return () => observer.disconnect();
  }, [esAdmin, medir, anuncios]);

  // Sin anuncios activos no hay cinta. Cubre tres casos que para el visitante
  // son el mismo: todavía no cargó, el admin los desactivó a todos, o la carga
  // falló. En ninguno tiene sentido una franja vacía empujando la página.
  if (esAdmin || anuncios.length === 0) return null;

  // Antes de poder medir se renderiza un solo grupo, quieto: es lo que permite
  // tomarle el ancho. Sin movimiento no hacen falta copias.
  const totalGrupos = animar && medidas ? medidas.repeticiones * 2 : 1;

  return (
    // Con la cinta en movimiento el desborde se recorta (es lo que hace el
    // efecto). Quieta, se vuelve scrolleable a mano: si no, un mensaje más
    // ancho que la pantalla quedaría cortado y sin ninguna forma de leerlo.
    <div
      ref={contenedorRef}
      className={`w-full bg-surface-container-high ${
        animar ? "overflow-hidden" : "overflow-x-auto"
      }`}
    >
      <div
        className={`flex w-max py-2.5 font-body-md text-[13px] leading-tight text-on-surface-variant sm:text-body-md ${
          // La duración llega por `style`; sin ella la animación usaría el
          // default de 0s del navegador y la pista aparecería ya desplazada.
          animar && medidas ? "animate-marquee hover:[animation-play-state:paused]" : ""
        }`}
        style={animar && medidas ? { animationDuration: `${medidas.duracionS}s` } : undefined}
      >
        {Array.from({ length: totalGrupos }, (_, indice) => (
          <GrupoMensajes
            key={indice}
            anuncios={anuncios}
            decorativo={indice > 0}
            innerRef={indice === 0 ? grupoRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default BarraAnuncios;
