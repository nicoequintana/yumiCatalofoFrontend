/**
 * Alternancia entre los paneles del editor.
 *
 * Son botones de alternancia y NO un `tablist` de ARIA: el patrón de pestañas
 * exige `role="tabpanel"`, `aria-controls` y flechas con `tabindex` móvil, y
 * declarar solo los roles hacía que un lector de pantalla anunciara "pestaña,
 * 1 de 3" y después no encontrara ningún panel. `aria-pressed` describe
 * exactamente lo que estos botones hacen.
 *
 * Desde que existe la solapa Imágenes se muestran SIEMPRE, no solo debajo de
 * `lg`: en pantallas anchas el formulario y las imágenes comparten la columna
 * izquierda y estos botones son lo único que elige cuál se ve. La vista previa
 * sigue ocupando la columna derecha por su cuenta en `lg`.
 */
const PANELES = [
  { id: "form", etiqueta: "Editar", icono: "edit" },
  { id: "imagenes", etiqueta: "Imágenes", icono: "photo_library" },
  { id: "preview", etiqueta: "Vista previa", icono: "visibility", soloChico: true },
];

function EditorTabs({ panelActivo, onCambiarPanel }) {
  return (
    <div
      className="sticky top-0 z-10 flex border-b border-outline-variant bg-surface px-4"
      role="group"
      aria-label="Panel visible"
    >
      {PANELES.map((panel) => (
        <button
          key={panel.id}
          type="button"
          aria-pressed={panelActivo === panel.id}
          onClick={() => onCambiarPanel(panel.id)}
          className={`font-label-md text-label-md flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 uppercase tracking-widest ${
            panel.soloChico ? "lg:hidden" : ""
          } ${
            panelActivo === panel.id
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{panel.icono}</span>
          {panel.etiqueta}
        </button>
      ))}
    </div>
  );
}

export default EditorTabs;
