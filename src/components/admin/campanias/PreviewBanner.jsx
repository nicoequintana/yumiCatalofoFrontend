import SlideCampania from "../../SlideCampania.jsx";

/**
 * La vista previa del slide del banner, al lado de los campos que lo escriben.
 *
 * Renderiza el MISMO componente que ve el carrusel de la home
 * (`SlideCampania`, con `interactivo={false}`: el botón se ve pero no
 * navega). Es lo que evita que la previa y lo que ve el cliente diverjan — el
 * bug que ya pasó con el tema oscuro.
 *
 * `paleta-clara` sigue siendo obligatorio acá, mismo criterio que
 * `PreviewCartel`: el catálogo público NO tiene tema oscuro, así que un admin
 * con el panel en oscuro vería un slide que el cliente nunca ve — y no podría
 * juzgar el contraste de lo que está por publicar.
 *
 * El fondo son barras esqueleto: sugieren que esto se apoya sobre la home sin
 * dibujar una home falsa que después divergiría de la real.
 */
export default function PreviewBanner({ slide }) {
  return (
    <div
      data-testid="preview-banner"
      className="rounded-xl border border-outline-variant bg-surface-container-low p-6"
    >
      <div className="paleta-clara flex flex-col gap-3 rounded-lg bg-background p-4">
        <div aria-hidden="true" className="h-4 w-24 rounded bg-surface-container-high" />

        {slide?.titulo ? (
          <div className="aspect-[2.9/1] w-full overflow-hidden rounded-xl">
            <SlideCampania slide={slide} interactivo={false} />
          </div>
        ) : null}

        <div aria-hidden="true" className="grid grid-cols-4 gap-2">
          <div className="h-16 rounded bg-surface-container-high" />
          <div className="h-16 rounded bg-surface-container-high" />
          <div className="h-16 rounded bg-surface-container-high" />
          <div className="h-16 rounded bg-surface-container-high" />
        </div>
      </div>
    </div>
  );
}
