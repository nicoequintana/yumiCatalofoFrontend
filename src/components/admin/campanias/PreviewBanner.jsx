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
          <div
            // ⚠️ LA PROPORCIÓN ESPEJA A `CarruselCampanias.jsx` EXACTO, con su
            // breakpoint incluido: 2,9:1 en móvil y 3,6:1 en escritorio.
            //
            // Hasta el 06/09/2026 acá había un `aspect-[2.9/1]` fijo, así que
            // el panel mostraba SIEMPRE el encuadre de móvil — y el recorte del
            // arte es justamente lo que difiere entre los dos breakpoints. Un
            // preview que recorta distinto que la home es peor que no tenerlo:
            // da confianza sobre un encuadre que nadie va a ver.
            className="aspect-[2.9/1] w-full overflow-hidden rounded-xl md:aspect-[3.6/1]"
          >
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
