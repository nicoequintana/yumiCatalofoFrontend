import { Link } from "react-router-dom";
import useBloquearScroll from "../hooks/useBloquearScroll.js";
import useDialogo from "../hooks/useDialogo.js";

/**
 * El cartel estacional del catálogo público.
 *
 * Es el ÚNICO elemento del sitio que interrumpe a alguien que no lo pidió, así
 * que se comporta como un diálogo de verdad y no como una capa decorativa:
 * `useDialogo` le da foco inicial, trampa de foco, cierre por Escape y
 * restauración del foco al salir, y `useBloquearScroll` frena la página de
 * atrás. Es el mismo tratamiento que el panel móvil del navbar y el lightbox.
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
  useBloquearScroll(true);

  const { partes, dias } = partirPorContador(modal.texto, modal.diasFaltantes);

  return (
    // El velo es hermano del contenido y no su padre por la trampa que ya
    // documenta `Navbar.jsx`: un ancestro con `backdrop-filter` se convierte en
    // bloque contenedor de sus descendientes `fixed` y les rompe el
    // posicionamiento.
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-margin-mobile">
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
    </div>
  );
}
