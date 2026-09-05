import BannerCampania from "../../BannerCampania.jsx";

/**
 * Cómo se va a ver la franja de la home, al lado de los campos que la escriben.
 *
 * Reusa `BannerCampania` con `interactivo={false}` — el MISMO componente que ve
 * el visitante, igual que `PreviewCartel` reusa `CartelCampania`. Duplicar el
 * markup dejaría dos banners divergiendo en silencio.
 *
 * El fondo son barras esqueleto: sugieren que esto se apoya sobre la home sin
 * dibujar una home falsa que después divergiría de la real.
 */
export default function PreviewBanner({ banner }) {
  return (
    <div
      data-testid="preview-banner"
      className="rounded-xl border border-outline-variant bg-surface-container-low p-6"
    >
      {/* `paleta-clara`: el catálogo público NO tiene tema oscuro, así que un
          admin con el panel en oscuro vería una franja que el cliente nunca ve
          — y no podría juzgar el contraste de lo que está por publicar. Mismo
          criterio que `PreviewCartel`. */}
      <div className="paleta-clara flex flex-col gap-3 rounded-lg bg-background p-4">
        <div aria-hidden="true" className="h-4 w-24 rounded bg-surface-container-high" />

        <BannerCampania banner={banner} interactivo={false} />

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
