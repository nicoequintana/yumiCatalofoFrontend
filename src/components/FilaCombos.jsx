import { useState } from "react";
import CabezaSeccion, { EyebrowSeccion } from "./CabezaSeccion.jsx";
import TarjetaCombo from "./TarjetaCombo.jsx";

/**
 * Fila deslizable de `TarjetaCombo`, ancho completo, con puntos — spec §7.1.
 * Reusada en la home (después de "Más vendidos") y en la ficha ("Llevalo en
 * combo y ahorrá"). `enlace` es opcional: la home lo usa ("Ver todos los
 * combos"), la ficha no.
 */
function FilaCombos({ combos = [], titulo, bajada, enlace }) {
  // Qué card está a la vista, para el punto activo. Es layout (posición de
  // scroll), no un dato del negocio: se deriva del DOM, no de la API.
  const [visible, setVisible] = useState(0);

  if (combos.length === 0) return null;

  function alDeslizar(evento) {
    const fila = evento.currentTarget;
    const anchoPorCard = fila.scrollWidth / combos.length;
    setVisible(anchoPorCard > 0 ? Math.min(combos.length - 1, Math.round(fila.scrollLeft / anchoPorCard)) : 0);
  }

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12">
      <CabezaSeccion
        eyebrow={<EyebrowSeccion icono="redeem">Combos</EyebrowSeccion>}
        titulo={titulo}
        bajada={bajada}
        enlace={enlace}
      />
      {/* Por debajo de `md` la fila sangra hasta el borde del viewport
          (`-mx-margin-mobile`, mismo patrón que `NuevosIngresos.jsx`): así la
          card siguiente asoma cortada contra el borde real de la pantalla,
          como en el diseño aprobado, y no contra el padding de la sección.
          `px-margin-mobile`/`scroll-px-margin-mobile` compensan ese sangrado
          para que la primera card siga alineada con el resto del contenido.
          Desde `md` no hace falta: la fila vuelve al ancho de la sección. */}
      <div
        className="-mx-margin-mobile grid auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto px-margin-mobile pb-1.5 scroll-px-margin-mobile [scroll-snap-type:x_mandatory] md:mx-0 md:auto-cols-[100%] md:px-0"
        role="list"
        onScroll={alDeslizar}
      >
        {combos.map((combo) => (
          <div key={combo.id} role="listitem" className="[scroll-snap-align:start]">
            <TarjetaCombo combo={combo} />
          </div>
        ))}
      </div>
      {combos.length > 1 ? (
        <div aria-hidden="true" className="mt-3 flex justify-center gap-1.5">
          {combos.map((combo, indice) => (
            <i
              key={combo.id}
              data-testid="punto-fila-combos"
              data-activo={indice === visible}
              className={`h-1.5 rounded-full transition-all ${indice === visible ? "w-5 bg-primary" : "w-1.5 bg-outline-variant"}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default FilaCombos;
