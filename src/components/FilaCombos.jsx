import { useEffect, useRef, useState } from "react";
import CabezaSeccion, { EyebrowSeccion } from "./CabezaSeccion.jsx";
import TarjetaCombo from "./TarjetaCombo.jsx";

const CLASE_FLECHA =
  "hidden h-11 w-11 place-items-center rounded-full bg-surface-container-lowest text-primary shadow-sombra-1 transition-colors [&:not([aria-disabled=true])]:hover:bg-primary [&:not([aria-disabled=true])]:hover:text-on-primary aria-disabled:cursor-default aria-disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:grid motion-reduce:transition-none";

/**
 * ¿La pista está en el inicio / en el final? Con `scrollWidth` en 0 (sin layout:
 * jsdom, o antes del primer pintado) no se sabe dónde termina: no se deshabilita
 * "Siguientes" por las dudas. 1px de tolerancia por el redondeo del scroll.
 */
function limitesDePista(pista) {
  const inicio = pista.scrollLeft <= 1;
  const final = pista.scrollWidth > 0 && pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 1;
  return { inicio, final };
}

/**
 * Fila deslizable de `TarjetaCombo`, ancho completo — spec §7.1, rediseño del
 * 15/09/2026. Reusada en la home (después de "Más vendidos") y en la ficha
 * ("Llevalo en combo y ahorrá"). `enlace` es opcional: la home lo usa ("Ver
 * todos los combos"), la ficha no.
 *
 * Escritorio: flechas "Anteriores"/"Siguientes" (mismos nombres que
 * `CarruselDestacados`) que corren UNA card, y puntos. Mobile: se desliza con
 * el dedo, la card mide 86% y la siguiente asoma; las flechas no se muestran.
 * Sin autoplay. La pista lleva padding + margen negativo (`.fila-combos-pista`
 * en `index.css`) para que el scroll no le recorte la sombra al ticket.
 */
function FilaCombos({ combos = [], titulo, bajada, enlace }) {
  // Qué card está a la vista, para el punto activo. Es layout (posición de
  // scroll), no un dato del negocio: se deriva del DOM, no de la API.
  const [visible, setVisible] = useState(0);
  const pistaRef = useRef(null);
  // Las flechas se deshabilitan en las puntas: "Anteriores" al inicio y
  // "Siguientes" al final. Con `aria-disabled`, NUNCA con `disabled`: un botón
  // nativo deshabilitado suelta el foco a <body> y quien navega con teclado
  // pierde su lugar en la fila. El click se ignora en `desplazar`.
  const [limites, setLimites] = useState({ inicio: true, final: false });

  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return undefined;
    const actualizar = () => setLimites(limitesDePista(pista));
    actualizar();
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, [combos.length]);

  if (combos.length === 0) return null;

  /** Ancho de una card MÁS el hueco: sin el `gap`, cada flecha se quedaría corta. */
  function pasoPorCard(pista) {
    const card = pista.querySelector("[role='listitem']");
    const ancho = card?.offsetWidth ?? 0;
    if (ancho <= 0) return 0;
    return ancho + (parseFloat(window.getComputedStyle(pista).columnGap) || 0);
  }

  function alDeslizar(evento) {
    const pista = evento.currentTarget;
    // Sin layout (jsdom, o antes del primer pintado) se cae al promedio.
    const paso = pasoPorCard(pista) || pista.scrollWidth / combos.length;
    setVisible(paso > 0 ? Math.min(combos.length - 1, Math.round(pista.scrollLeft / paso)) : 0);
    setLimites(limitesDePista(pista));
  }

  function desplazar(direccion) {
    const pista = pistaRef.current;
    if (!pista) return;
    if (direccion < 0 ? limites.inicio : limites.final) return;
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    pista.scrollBy({ left: direccion * pasoPorCard(pista), behavior: reducido ? "auto" : "smooth" });
  }

  const hayVarios = combos.length > 1;

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12">
      <CabezaSeccion
        eyebrow={<EyebrowSeccion icono="redeem">Combos</EyebrowSeccion>}
        titulo={titulo}
        bajada={bajada}
        enlace={enlace}
      />
      <div
        ref={pistaRef}
        className="fila-combos-pista grid grid-flow-col overflow-x-auto"
        role="list"
        onScroll={alDeslizar}
      >
        {combos.map((combo) => (
          <div key={combo.id} role="listitem" className="min-w-0">
            <TarjetaCombo combo={combo} />
          </div>
        ))}
      </div>
      {hayVarios ? (
        <div className="mt-2.5 flex items-center justify-center gap-3.5">
          <button type="button" aria-label="Anteriores" aria-disabled={limites.inicio} onClick={() => desplazar(-1)} className={CLASE_FLECHA}>
            <span aria-hidden="true" className="material-symbols-outlined">
              chevron_left
            </span>
          </button>
          <div aria-hidden="true" className="flex gap-1.5">
            {combos.map((combo, indice) => (
              <i
                key={combo.id}
                data-testid="punto-fila-combos"
                data-activo={indice === visible}
                className={`h-[7px] rounded-full transition-all motion-reduce:transition-none ${indice === visible ? "w-[22px] bg-primary" : "w-[7px] bg-outline-variant"}`}
              />
            ))}
          </div>
          <button type="button" aria-label="Siguientes" aria-disabled={limites.final} onClick={() => desplazar(1)} className={CLASE_FLECHA}>
            <span aria-hidden="true" className="material-symbols-outlined">
              chevron_right
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default FilaCombos;
