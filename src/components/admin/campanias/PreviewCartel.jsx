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
      className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-6"
    >
      {/* ⚠️ EL FONDO VA DETRÁS Y EN `absolute`, Y LA TARJETA EN FLUJO.
          Al revés —el esqueleto marcando el alto y la tarjeta encima— el panel
          medía lo que medía el fondo, y un cartel más alto se recortaba contra
          el `overflow-hidden`. Lo primero que se perdía era el botón, que es el
          final de la tarjeta. Y el alto de un cartel es variable por
          definición: el título, el texto y el arte los escribe el admin. */}
      <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-3 p-6">
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
      <div aria-hidden="true" className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* `max-w-md` es EXACTAMENTE el ancho del modal real (`ModalCampania`).
          Un preview más angosto o más ancho mentiría sobre dónde cortan el
          título y el texto, que es lo único que este panel existe para mostrar. */}
      <div className="relative mx-auto w-full max-w-md rounded-2xl bg-surface-container-lowest px-6 py-7 shadow-ambient">
        <CartelCampania modal={modal} interactivo={false} />
      </div>
    </div>
  );
}
