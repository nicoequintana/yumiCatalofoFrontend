/**
 * El aspecto de TODOS los botones-toggle del panel de filtros de órdenes.
 *
 * **Vive acá y no en cada archivo porque son dos grupos apilados uno arriba
 * del otro en la misma caja**: los chips de estado (`AdminOrdenes.jsx`) y los
 * presets de período (`FiltroPeriodoOrdenes.jsx`). Con una clase por archivo
 * quedaban dos pintas distintas a diez píxeles de distancia —una con borde y
 * `label-sm`, otra sin borde y `label-md`— sin ninguna diferencia de
 * significado que la justificara.
 *
 * ⚠️ **NO es `SelectorPeriodo.claseBoton`, y no se unifica con ella.** Ese
 * componente lo comparten las cuatro pantallas de analytics: tocarlo desde acá
 * cambiaría Ventas, Embudo, Clientes y Operación por un ajuste de Órdenes. La
 * duplicación entre esta función y aquella es deliberada y de una sola punta:
 * este archivo puede cambiar sin mirar a la otra.
 *
 * Lleva borde incluso apagado porque el panel de filtros ya es una superficie
 * elevada (`bg-surface-container-low`): sin borde, un toggle inactivo se
 * confunde con el fondo y deja de leerse como control.
 *
 * @param {boolean} activo
 * @returns {string} las clases del botón
 */
export function claseToggleOrdenes(activo) {
  return `font-label-md text-label-md inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 py-2 uppercase tracking-widest transition-colors ${
    activo
      ? "border-primary bg-primary text-on-primary"
      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface"
  }`;
}
