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
      // Única pieza sticky del editor: queda pegada justo debajo de la barra
      // superior del shell (`topbar-admin`, ver `AdminLayout.jsx`). En
      // `lg` no hace falta — el editor no scrollea como página, cada columna
      // scrollea por su cuenta.
      //
      // El `top` suma una TERCERA punta al contrato de `topbar-admin`:
      // `calc(var(--alto-cinta-ambiente) + theme(spacing.topbar-admin))`, no
      // `top-topbar-admin` a secas. `--alto-cinta-ambiente` la declara
      // `CintaAmbiente.jsx` (ver `index.css`) y vale `0px` en producción, así
      // que ahí el cálculo da exactamente lo mismo que antes. En dev, sin
      // sumarla, la barra del admin YA se corre debajo de la cinta (ver
      // `AdminLayout.jsx`) pero esta pestaña seguía anclada al viejo
      // `topbar-admin` a secas y quedaba tapada por la cinta igual.
      className="sticky top-[calc(var(--alto-cinta-ambiente)_+_theme(spacing.topbar-admin))] z-10 flex border-b border-outline-variant bg-surface px-4 lg:static"
      role="group"
      aria-label="Panel visible"
    >
      {PANELES.map((panel) => (
        <button
          key={panel.id}
          type="button"
          aria-pressed={panelActivo === panel.id}
          onClick={() => onCambiarPanel(panel.id)}
          // Ícono arriba y etiqueta abajo por debajo de `md`: a 375px "VISTA
          // PREVIA" con su ícono al lado no entra en el tercio del botón. En
          // `md+` es idéntico a como era antes (ícono y texto en fila).
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2 font-label-sm text-label-sm uppercase tracking-wide md:flex-row md:gap-2 md:px-3 md:py-3 md:font-label-md md:text-label-md md:tracking-widest ${
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
