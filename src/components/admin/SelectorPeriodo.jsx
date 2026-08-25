/**
 * Ventanas de tiempo ofrecidas por las pantallas de analytics del admin.
 *
 * No se exporta: las pantallas ya no necesitan conocer las opciones, solo el
 * `dias` elegido. Mantenerla privada es además lo que deja el archivo
 * exportando un único componente, como pide la regla de Fast Refresh.
 */
const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

function claseBoton(activo) {
  return `font-label-md text-label-md min-h-11 rounded-lg px-4 py-2 uppercase tracking-widest transition-colors ${
    activo
      ? "bg-primary text-on-primary"
      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
  }`;
}

/**
 * Selector de período de las pantallas de analytics (`ventas`, `embudo`,
 * `clientes`, `operacion`).
 *
 * Es un grupo de botones y no un `<select>` a propósito: son tres opciones
 * fijas y el cambio de período es la interacción más frecuente de estas
 * pantallas, así que conviene que estén las tres a un solo click.
 *
 * `aria-pressed` en vez de `role="radio"`: cada botón es un toggle de estado
 * de la vista, no la selección de un valor dentro de un formulario, y el
 * patrón de radiogroup exigiría manejo de flechas y `tabindex` móvil que estos
 * tres botones no justifican.
 *
 * @param {{dias: number, onCambiar: (dias: number) => void}} props
 */
function SelectorPeriodo({ dias, onCambiar }) {
  return (
    <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
      {PERIODOS.map((periodo) => (
        <button
          key={periodo.dias}
          type="button"
          onClick={() => onCambiar(periodo.dias)}
          aria-pressed={dias === periodo.dias}
          className={claseBoton(dias === periodo.dias)}
        >
          {periodo.label}
        </button>
      ))}
    </div>
  );
}

export default SelectorPeriodo;
