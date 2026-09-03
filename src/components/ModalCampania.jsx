import { Link } from "react-router-dom";
import LogoYima from "./LogoYima.jsx";
import useDialogo from "../hooks/useDialogo.js";
import VeloModal from "./VeloModal.jsx";

/**
 * El cartel estacional del catálogo público.
 *
 * Es el ÚNICO elemento del sitio que interrumpe a alguien que no lo pidió, así
 * que se comporta como un diálogo de verdad y no como una capa decorativa:
 * `useDialogo` le da foco inicial, trampa de foco, cierre por Escape y
 * restauración del foco al salir, y `VeloModal` desenfoca y frena la página
 * de atrás. Es el mismo tratamiento que el panel móvil del navbar y el
 * lightbox.
 *
 * EL DOODLE. El arte de la campaña abre el cartel, y sale de `modal.doodleUrl`
 * —el Doodle de ESTA campaña, no el del encabezado—: los dos recursos se
 * resuelven aparte en el backend y pueden caer en campañas distintas. Es además
 * el único lugar donde el Doodle se ve en tamaño real; en el navbar mide 28px
 * de alto y compite con toda la barra.
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

export default function ModalCampania({ modal, onCerrar }) {
  const dialogoRef = useDialogo({ onCerrar });

  const { partes, dias } = partirPorContador(modal.texto, modal.diasFaltantes);

  return (
    // El velo es hermano del contenido y no su padre por la trampa que ya
    // documenta `Navbar.jsx`: un ancestro con `backdrop-filter` se convierte en
    // bloque contenedor de sus descendientes `fixed` y les rompe el
    // posicionamiento.
    <VeloModal className="z-[60] flex items-center justify-center bg-black/50 px-margin-mobile">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-campania"
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-6 shadow-xl outline-none md:p-8"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
            close
          </span>
        </button>

        {modal.doodleUrl ? (
          <LogoYima decorativo doodleUrl={modal.doodleUrl} className="mb-5 h-20 md:h-24" />
        ) : null}

        <h2
          id="titulo-modal-campania"
          className="font-headline-md text-headline-md mb-3 pr-8 text-primary"
        >
          {modal.titulo}
        </h2>

        {partes.length > 0 ? (
          <p className="font-body-lg text-body-lg text-on-surface">
            {partes.map((parte, indice) => (
              // El índice como key es correcto acá: la lista sale de partir un
              // string, no de datos que se puedan reordenar.
              // eslint-disable-next-line react/no-array-index-key
              <span key={indice}>
                {parte}
                {dias !== null && indice < partes.length - 1 ? (
                  <strong className="font-headline-sm text-headline-sm text-secondary">
                    {dias}
                  </strong>
                ) : null}
              </span>
            ))}
          </p>
        ) : null}

        {modal.ctaTexto && modal.ctaDestino ? (
          <Link
            to={modal.ctaDestino}
            onClick={onCerrar}
            className="font-label-lg text-label-lg mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-on-primary transition-opacity hover:opacity-90"
          >
            {modal.ctaTexto}
          </Link>
        ) : null}
      </div>
    </VeloModal>
  );
}
