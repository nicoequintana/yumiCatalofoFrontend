import Interruptor from "./Interruptor.jsx";
import PreviewBanner from "./PreviewBanner.jsx";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";

/**
 * La franja que queda en la home DESPUÉS de que el visitante cierra el cartel.
 *
 * Campos a la izquierda, preview a la derecha — mismo reparto que
 * `SeccionCartel`, y por el mismo motivo: no hay forma de juzgar cómo entra un
 * título en una franja leyendo un `<input>`.
 *
 * **No tiene selector de destino.** El destino es de la campaña y vive en
 * `SeccionDestinoCta`, que el cartel y el banner comparten.
 *
 * Los campos se muestran SIEMPRE, no solo con el banner prendido: se puede
 * escribir con calma y prenderlo después. El backend solo exige el título
 * cuando está activo.
 */
export default function SeccionBanner({
  valores,
  editar,
  opciones,
  campania,
  diasFaltantes,
  guardando,
}) {
  // Lo que va a ver el visitante, armado con lo que hay tipeado AHORA.
  const bannerPreview = {
    doodleUrl: campania?.doodleUrl ?? null,
    titulo: valores.bannerTitulo || "Título del banner",
    texto: valores.bannerTexto,
    diasFaltantes,
    // Con `interactivo` apagado el valor nunca se navega. Acá alcanza con decir
    // SI HAY botón; la ruta real la resuelve el backend al leer.
    ctaDestino: valores.modalCtaTipo ? "#" : null,
    ctaTexto: valores.bannerCtaTexto.trim() || opciones?.ctaTextoPorDefecto || "",
  };

  return (
    <section
      aria-labelledby="titulo-seccion-banner"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <h2 id="titulo-seccion-banner" className="font-headline-sm text-headline-sm mb-1 text-primary">
        Banner de la home
      </h2>
      <p className="font-body-sm text-body-sm mb-5 text-on-surface-variant">
        El cartel se cierra y no vuelve hasta la próxima visita. El banner queda.
      </p>

      <div className="mb-5">
        <Interruptor
          etiqueta="Mostrar en la home mientras la campaña esté activa"
          activo={valores.bannerEnHome}
          onCambiar={(valor) => editar("bannerEnHome", valor)}
          disabled={guardando}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="campania-banner-titulo" className={claseEtiqueta}>
              Título
            </label>
            <input
              id="campania-banner-titulo"
              type="text"
              maxLength={120}
              value={valores.bannerTitulo}
              onChange={(e) => editar("bannerTitulo", e.target.value)}
              className={claseCampo}
              placeholder="Semana del Hogar"
            />
          </div>

          <div>
            <label htmlFor="campania-banner-texto" className={claseEtiqueta}>
              Texto{" "}
              <span className="normal-case tracking-normal">
                · <code className="text-secondary">{"{dias}"}</code> pone el contador · máx. 200
              </span>
            </label>
            <textarea
              id="campania-banner-texto"
              rows={2}
              maxLength={200}
              value={valores.bannerTexto}
              onChange={(e) => editar("bannerTexto", e.target.value)}
              className={claseCampo}
              placeholder="Hasta 30 % en cocina, deco e iluminación."
            />
          </div>

          <div>
            <label htmlFor="campania-banner-cta" className={claseEtiqueta}>
              Botón
            </label>
            <input
              id="campania-banner-cta"
              type="text"
              maxLength={60}
              value={valores.bannerCtaTexto}
              onChange={(e) => editar("bannerCtaTexto", e.target.value)}
              className={claseCampo}
              placeholder={opciones?.ctaTextoPorDefecto ?? ""}
            />
          </div>
        </div>

        <PreviewBanner banner={bannerPreview} />
      </div>
    </section>
  );
}
