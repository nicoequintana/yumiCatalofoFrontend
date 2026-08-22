import { useEffect, useRef } from "react";

/**
 * Elementos que el navegador considera enfocables por teclado. `[tabindex="-1"]`
 * queda afuera a propósito: es enfocable por script, no con Tab, y meterlo en el
 * ciclo del trap haría que el propio contenedor del diálogo capture un tabulado.
 */
const SELECTOR_FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Comportamiento de teclado y foco que un diálogo modal necesita para ser
 * usable sin mouse. Cubre las cuatro piezas que ninguna de las superficies
 * modales del proyecto tenía:
 *
 * 1. **Foco inicial** dentro del diálogo al abrirse — si no, el foco se queda
 *    detrás del overlay y el usuario ve una pantalla negra sin saber dónde está.
 * 2. **Trampa de foco**: Tab y Shift+Tab circulan dentro del diálogo en vez de
 *    salir a la página de abajo, que está tapada y no se puede ver.
 * 3. **Escape** cierra.
 * 4. **Restauración del foco** al elemento que lo tenía antes de abrir, para que
 *    al cerrar el usuario vuelva exactamente al control desde donde abrió.
 *
 * El ref devuelto va en el elemento contenedor del diálogo, que además debe
 * llevar `tabIndex={-1}` (para poder recibir el foco inicial cuando adentro no
 * hay ningún control enfocable) y `role="dialog"` + `aria-modal="true"`.
 *
 * La lista de enfocables se recalcula en cada Tab y no una sola vez al abrir:
 * el contenido de un diálogo puede cambiar mientras está abierto (un botón que
 * se deshabilita mientras se guarda, un mensaje de error que aparece).
 *
 * @param {{abierto?: boolean, onCerrar: () => void}} opciones
 * @returns {React.RefObject<HTMLElement>} ref para el contenedor del diálogo
 */
function useDialogo({ abierto = true, onCerrar }) {
  const contenedorRef = useRef(null);
  const onCerrarRef = useRef(onCerrar);

  // El callback se lee desde un ref para que el efecto principal dependa solo
  // de `abierto`. Si dependiera de `onCerrar` — casi siempre una arrow function
  // nueva en cada render — cualquier re-render del padre reinstalaría el efecto
  // y devolvería el foco al primer control, pisando dónde estaba el usuario.
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  });

  useEffect(() => {
    if (!abierto) return undefined;

    const contenedor = contenedorRef.current;
    if (contenedor === null) return undefined;

    const focoPrevio = document.activeElement;

    function enfocables() {
      return Array.from(contenedor.querySelectorAll(SELECTOR_FOCUSABLE));
    }

    const iniciales = enfocables();
    (iniciales[0] ?? contenedor).focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCerrarRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const elementos = enfocables();
      if (elementos.length === 0) {
        event.preventDefault();
        contenedor.focus();
        return;
      }

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      const activo = document.activeElement;
      const adentro = contenedor.contains(activo);

      if (event.shiftKey && (!adentro || activo === primero)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (!adentro || activo === ultimo)) {
        event.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (focoPrevio instanceof HTMLElement) {
        focoPrevio.focus();
      }
    };
  }, [abierto]);

  return contenedorRef;
}

export default useDialogo;
