import { Link } from "react-router-dom";
import LogoYima from "./LogoYima.jsx";

/**
 * La CARD del cartel estacional: arte, título, texto con su contador y CTA.
 *
 * Vive separado de `ModalCampania` —que aporta la cáscara de diálogo: velo,
 * foco, Escape y botón cerrar— porque el panel de campañas muestra el MISMO
 * cartel como vista previa, y ahí no hay diálogo ni nada que cerrar. Duplicar
 * el markup habría dejado dos carteles divergiendo en silencio: el admin
 * aprobaría uno y el visitante vería otro.
 *
 * `role="dialog"` y `aria-labelledby` NO están acá a propósito: son de la
 * cáscara. Este componente solo recibe el id que tiene que llevar su `<h2>`
 * (`idTitulo`), para que quien lo envuelva pueda nombrarse con él.
 *
 * EL DOODLE. El arte sale de `modal.doodleUrl` —el Doodle de ESTA campaña, no
 * el del encabezado—: los dos recursos se resuelven aparte en el backend y
 * pueden caer en campañas distintas.
 *
 * Va `decorativo`, o sea con `alt=""`: el diálogo ya se nombra por su `<h2>`, y
 * un `alt="YIMA"` acá haría que un lector de pantalla anuncie la marca antes
 * del título sin agregar información. Es el mismo criterio que el logo del
 * panel, que acompaña al texto "YIMA ADMIN".
 *
 * Una campaña SIN arte no cae en el wordmark de siempre: no se pinta nada. El
 * cartel no es el encabezado del sitio, y la marca ya está arriba.
 *
 * EL CONTADOR. `texto` llega crudo con el marcador `{dias}` y el backend manda
 * `diasFaltantes` ya resuelto. La sustitución se hace acá porque es
 * presentación —el número va resaltado—, pero **el cálculo nunca sale del
 * backend**: es la única definición de "día" del sistema.
 *
 * EL CTA. Se pinta cuando hay `ctaDestino`, y nada más: `ctaTexto` ya llega con
 * su default resuelto por el backend, así que exigirlo además solo podría
 * esconder un botón que la campaña sí quiere.
 */

/** El marcador que el admin escribe en el texto del modal. */
const MARCADOR_DIAS = "{dias}";

/**
 * Parte el texto en los pedazos de alrededor del contador.
 *
 * Devuelve los trozos literales para que el número se pueda pintar aparte. Si
 * el texto no tiene marcador —o no hay contador que poner— sale entero, sin
 * ningún hueco.
 */
function partirPorContador(texto, dias) {
  if (!texto) return { partes: [], dias: null };
  if (dias === null || dias === undefined || !texto.includes(MARCADOR_DIAS)) {
    return { partes: [texto], dias: null };
  }
  return { partes: texto.split(MARCADOR_DIAS), dias };
}

/**
 * El resplandor cálido detrás del arte.
 *
 * Va en `style` y no en una utilidad `bg-[…]` de Tailwind por legibilidad: un
 * `radial-gradient` con paradas y alfa dentro de un valor arbitrario obliga a
 * escapar cada espacio con guiones bajos, y una coma mal puesta ahí no emite
 * ninguna regla ni ningún error.
 *
 * El token va en CANALES (`rgb(var(--token) / alfa)`), que es la única forma de
 * aplicarle opacidad a un color del tema — con hex el navegador descarta la
 * declaración entera y el resplandor simplemente no se pinta.
 */
const RESPLANDOR = {
  background:
    "radial-gradient(circle at center, rgb(var(--color-tertiary-container) / 0.55) 0%, rgb(var(--color-tertiary-container) / 0) 70%)",
};

export default function CartelCampania({ modal, onCtaClick, idTitulo, interactivo = true }) {
  const { partes, dias } = partirPorContador(modal.texto, modal.diasFaltantes);

  // La píldora del CTA se comparte entre el link real y el `<span>` inerte de
  // la vista previa: son el mismo botón, y que se vean distinto haría que el
  // admin apruebe algo que el visitante no ve.
  const clasesCta =
    "font-label-lg text-label-lg mt-7 inline-flex min-w-[200px] items-center justify-center rounded-full bg-primary px-8 py-3.5 text-on-primary shadow-lg";

  return (
    <div className="text-center">
      {modal.doodleUrl ? (
        // `relative` para que el resplandor tenga bloque contenedor. El arte va
        // encima (`relative`), el resplandor debajo (sin z-index: el orden del
        // DOM alcanza porque los dos están posicionados).
        <div className="relative mb-5 flex items-center justify-center">
          <span aria-hidden="true" className="absolute inset-x-0 -inset-y-6" style={RESPLANDOR} />
          <LogoYima decorativo doodleUrl={modal.doodleUrl} className="relative mx-auto h-14" />
        </div>
      ) : null}

      {/* 22px es el techo tipográfico del cartel: es una interrupción, y un
          título más grande la vuelve un aviso publicitario. */}
      <h2 id={idTitulo} className="font-headline-sm mb-3 text-[22px] leading-tight text-primary">
        {modal.titulo}
      </h2>

      {partes.length > 0 ? (
        // `max-w-[30ch]` es la medida de lectura: sin tope, en el ancho del
        // diálogo el párrafo se desparrama en una sola línea larga y el bloque
        // centrado pierde su eje.
        <p className="font-body-md mx-auto max-w-[30ch] text-[15px] leading-relaxed text-on-surface">
          {partes.map((parte, indice) => (
            // El índice como key es correcto acá: la lista sale de partir un
            // string, no de datos que se puedan reordenar.
            // eslint-disable-next-line react/no-array-index-key
            <span key={indice}>
              {parte}
              {dias !== null && indice < partes.length - 1 ? (
                <strong className="font-headline-sm text-[21px] text-secondary">{dias}</strong>
              ) : null}
            </span>
          ))}
        </p>
      ) : null}

      {modal.ctaDestino ? (
        interactivo ? (
          <Link to={modal.ctaDestino} onClick={onCtaClick} className={`${clasesCta} transition-opacity hover:opacity-90`}>
            {modal.ctaTexto}
          </Link>
        ) : (
          // Vista previa del panel: el botón se ve, pero no saca al admin de la
          // pantalla en la que está editando. `aria-disabled` en vez de sacarlo
          // del DOM porque lo que se está previsualizando es justamente el
          // cartel completo.
          <span aria-disabled="true" className={clasesCta}>
            {modal.ctaTexto}
          </span>
        )
      ) : null}
    </div>
  );
}
