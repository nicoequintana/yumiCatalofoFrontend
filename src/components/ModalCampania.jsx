import CartelCampania from "./CartelCampania.jsx";
import useDialogo from "../hooks/useDialogo.js";
import VeloModal from "./VeloModal.jsx";

/**
 * La CÁSCARA DE DIÁLOGO del cartel estacional del catálogo público.
 *
 * Es el ÚNICO elemento del sitio que interrumpe a alguien que no lo pidió, así
 * que se comporta como un diálogo de verdad y no como una capa decorativa:
 * `useDialogo` le da foco inicial, trampa de foco, cierre por Escape y
 * restauración del foco al salir, y `VeloModal` desenfoca y frena la página
 * de atrás. Es el mismo tratamiento que el panel móvil del navbar y el
 * lightbox.
 *
 * El CONTENIDO —arte, título, contador y CTA— es `CartelCampania`, que el panel
 * de campañas reusa como vista previa. Acá queda todo lo que es de diálogo y
 * solo de diálogo: el velo, el foco, el botón cerrar, y el `role="dialog"` con
 * su `aria-labelledby` apuntando al `<h2>` que el cartel pinta con el id que
 * este componente le pasa.
 */

/** El id del `<h2>` del cartel: es lo que nombra al diálogo. */
const ID_TITULO = "titulo-modal-campania";

export default function ModalCampania({ modal, onCerrar }) {
  const dialogoRef = useDialogo({ onCerrar });

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
        aria-labelledby={ID_TITULO}
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

        {/* Tocar el CTA cierra el diálogo además de navegar: sin eso, volver
            atrás desde el destino devolvería a la página con el cartel todavía
            abierto encima. */}
        <CartelCampania modal={modal} onCtaClick={onCerrar} idTitulo={ID_TITULO} />
      </div>
    </VeloModal>
  );
}
