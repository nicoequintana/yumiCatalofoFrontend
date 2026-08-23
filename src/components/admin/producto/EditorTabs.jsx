/**
 * Alternancia Editar / Vista previa, solo debajo de `lg`, donde los dos
 * paneles no entran uno al lado del otro.
 *
 * Son botones de alternancia y no un `tablist` de ARIA: el patrón de
 * pestañas exige `role="tabpanel"`, `aria-controls` y flechas con
 * `tabindex` móvil, y declarar solo los roles hacía que un lector de
 * pantalla anunciara "pestaña, 1 de 2" y después no encontrara ningún
 * panel. `aria-pressed` describe exactamente lo que estos dos botones
 * hacen.
 */
function EditorTabs({ panelActivo, onCambiarPanel }) {
  return (
    <div className="sticky top-0 z-10 flex border-b border-outline-variant bg-surface px-4 lg:hidden" role="group" aria-label="Panel visible">
      <button
        type="button"
        aria-pressed={panelActivo === "form"}
        onClick={() => onCambiarPanel("form")}
        className={`font-label-md text-label-md flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 uppercase tracking-widest ${
          panelActivo === "form"
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
        Editar
      </button>
      <button
        type="button"
        aria-pressed={panelActivo === "preview"}
        onClick={() => onCambiarPanel("preview")}
        className={`font-label-md text-label-md flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 uppercase tracking-widest ${
          panelActivo === "preview"
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">visibility</span>
        Vista previa
      </button>
    </div>
  );
}

export default EditorTabs;
