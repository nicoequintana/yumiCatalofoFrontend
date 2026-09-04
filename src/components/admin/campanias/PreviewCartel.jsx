import CartelCampania from "../../CartelCampania.jsx";

/**
 * Cómo se va a ver el cartel estacional, al lado de los campos que lo escriben.
 *
 * Reusa `CartelCampania` con `interactivo={false}` — el MISMO componente que ve
 * el visitante. Duplicar el markup habría dejado dos carteles divergiendo en
 * silencio: el admin aprobaría uno y el cliente vería otro.
 *
 * ⚠️ **NO reusa `ModalCampania`, y es deliberado.** Esa cáscara monta un portal,
 * atrapa el foco con `useDialogo` y bloquea el scroll del documento: metida en
 * una página del panel le robaría el foco al campo que se está tipeando y
 * frenaría el scroll de todo el editor. Acá el cartel es contenido de la
 * pantalla, no una interrupción.
 *
 * El fondo son barras esqueleto con velo borroso: sugieren que esto se apoya
 * sobre el sitio sin dibujar un sitio falso que después divergiría del real.
 */
export default function PreviewCartel({ modal }) {
  return (
    <div
      data-testid="preview-cartel"
      className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-4"
    >
      {/* El sitio insinuado. Decorativo: no aporta ninguna información. */}
      <div aria-hidden="true" className="flex flex-col gap-3 p-2">
        <div className="h-6 w-32 rounded bg-surface-container-high" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 rounded-lg bg-surface-container-high" />
          <div className="h-24 rounded-lg bg-surface-container-high" />
          <div className="h-24 rounded-lg bg-surface-container-high" />
        </div>
        <div className="h-4 w-2/3 rounded bg-surface-container-high" />
        <div className="h-4 w-1/2 rounded bg-surface-container-high" />
      </div>

      {/* El velo del modal real: `black/40` es un tinte, no un color del tema,
          igual que en `DialogoCampania`. */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        {/* `max-w-md` es EXACTAMENTE el ancho del modal real (`ModalCampania`).
            Un preview mas angosto o mas ancho mentiria sobre donde cortan el
            titulo y el texto, que es lo unico que este panel existe para mostrar. */}
        <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest px-6 py-7 shadow-ambient">
          <CartelCampania modal={modal} interactivo={false} />
        </div>
      </div>
    </div>
  );
}
