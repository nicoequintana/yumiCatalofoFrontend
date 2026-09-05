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
 *
 * ⚠️ El fallback del título en el preview reutiliza el MISMO placeholder que el
 * `<input>` (`PLACEHOLDER_TITULO`), nunca el texto de la etiqueta: la etiqueta
 * del campo es "Título del banner" y repetir esa misma frase en el preview
 * haría que `getByLabel("Título del banner")` resolviera DOS elementos —el
 * campo real y el título del slide— en vez de uno solo.
 */
const PLACEHOLDER_TITULO = "Semana del Hogar";

export default function SeccionBanner({
  valores,
  editar,
  opciones,
  campania,
  guardando,
}) {
  // Lo que va a ver el visitante, en la MISMA forma que arma el backend en
  // `aSlideCampania` — con los mismos defaults ya aplicados, para que la
  // previa nunca muestre algo distinto de lo publicado (el bug que ya pasó
  // con el tema oscuro, pero de dato). Sin `diasFaltantes`: el banner no tiene
  // contador (ese es del cartel, que tiene `modalFechaObjetivo` propio).
  const slidePreview = {
    tipo: "CAMPANIA",
    campaniaId: campania?.id ?? null,
    titulo: valores.bannerTitulo || PLACEHOLDER_TITULO,
    texto: valores.bannerTexto,
    // Con `interactivo` apagado el valor nunca se navega. Acá alcanza con decir
    // SI HAY botón; la ruta real la resuelve el backend al leer.
    ctaDestino: valores.modalCtaTipo ? "#" : null,
    ctaTexto: valores.bannerCtaTexto.trim() || opciones?.ctaTextoPorDefecto || "",
    // El arte del slide todavía no tiene campo en este formulario (falta la
    // sección de subida, como la del Doodle) — se prepara igual el campo para
    // que agregarla no exija tocar de nuevo la forma del preview.
    arteUrl: campania?.bannerArteUrl ?? null,
    doodleUrl: campania?.doodleUrl ?? null,
    // Mismo default que aplica el backend al leer (`COLOR_SLIDE_POR_DEFECTO`):
    // una campaña que todavía no eligió color sale en el de la marca.
    color: campania?.bannerColor ?? "TERRACOTA",
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
              Título del banner
            </label>
            <input
              id="campania-banner-titulo"
              type="text"
              maxLength={120}
              value={valores.bannerTitulo}
              onChange={(e) => editar("bannerTitulo", e.target.value)}
              className={claseCampo}
              placeholder={PLACEHOLDER_TITULO}
            />
          </div>

          <div>
            <label htmlFor="campania-banner-texto" className={claseEtiqueta}>
              Texto del banner{" "}
              <span className="normal-case tracking-normal">
                · el contador de días es del cartel · máx. 200
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
              Texto del botón del banner
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

        <PreviewBanner slide={slidePreview} />
      </div>
    </section>
  );
}
