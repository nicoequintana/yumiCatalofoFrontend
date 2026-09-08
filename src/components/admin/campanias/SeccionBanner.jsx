import { useRef, useState } from "react";
import Interruptor from "./Interruptor.jsx";
import PreviewBanner from "./PreviewBanner.jsx";
import { MEDIDA_SUGERIDA, avisoProporcionArte } from "./proporcionArte.js";
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
 * **Tampoco tiene texto del botón ni color** desde el 06/09/2026: con el slide
 * entero convertido en enlace, el CTA quedó como una señal de copy fijo y el
 * molde sin arte va siempre en el color de marca. Los dos dejaron de ser
 * decisiones, así que el formulario dejó de ofrecerlas — un campo que se guarda
 * y que ninguna pantalla lee es peor que no tenerlo.
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

/**
 * El mismo marcador que usa el cartel para su contador, pero PROHIBIDO acá: el
 * banner no cuenta días —eso es `modalFechaObjetivo`, que es del cartel—, y el
 * backend rechaza el marcador en `bannerTitulo`/`bannerTexto` con un 400.
 * Avisarlo ACÁ, mientras se tipea, evita que ese 400 llegue como el error
 * general de la página, que en este editor queda a ~1.700 px del botón de
 * Guardar y se leería como un botón que no hace nada.
 */
const MARCADOR_DIAS = /\{dias\}/i;

function avisoMarcadorDias(texto, campo) {
  if (!texto || !MARCADOR_DIAS.test(texto)) return null;
  return `El contador \`{dias}\` es del cartel, no del banner. Sacalo de \`${campo}\` o escribí los días a mano.`;
}

/** Tipos y peso máximo de la imagen del arte, espejados del backend (sync
 * manual entre repos, igual que `MediaUploader`): sin este freno del lado del
 * cliente, un archivo de sobra sube durante minutos para volver como 413 — y
 * en este editor el error general se pinta lejos del botón que lo disparó. */
const TIPOS_ARTE = ["image/jpeg", "image/png", "image/webp"];
const MAX_ARTE_BYTES = 15 * 1024 * 1024;

export default function SeccionBanner({
  valores,
  editar,
  campania,
  guardando,
  esEdicion,
  onSubirArte,
  onQuitarArte,
}) {
  const [errorArte, setErrorArte] = useState(null);
  // La proporción del arte YA guardado: se mide al cargar la miniatura,
  // porque es la pieza que está en producción ahora mismo.
  const [avisoArte, setAvisoArte] = useState(null);
  const inputArte = useRef(null);

  // Derivado directo de `valores`, como el resto de los campos: `editar(...)`
  // hace `setValores` en el editor real, así que cada tecla YA dispara un
  // re-render con el prop nuevo. Un buffer local acá sería redundante —y
  // peligroso: `duplicar()` navega a la misma forma de ruta
  // (`/campanias/:id/editar`) sin cambiar de árbol de componentes, así que
  // React NO remonta este componente al pasar de una campaña a otra. Un
  // estado inicializado "una sola vez" quedaría congelado con el texto de la
  // campaña ANTERIOR, y el admin editaría creyendo que ve la nueva.
  const avisoTitulo = avisoMarcadorDias(valores.bannerTitulo, "bannerTitulo");
  const avisoTexto = avisoMarcadorDias(valores.bannerTexto, "bannerTexto");

  /**
   * Valida tipo y tamaño ANTES de subir. Es una cortesía, no la defensa: el
   * backend valida magic bytes sobre el contenido real del archivo, no sobre
   * lo que el cliente declara.
   */
  function elegirArte(evento) {
    const archivo = evento.target.files?.[0];
    // Se limpia SIEMPRE, así reintentar con el mismo archivo vuelve a disparar
    // el change.
    evento.target.value = "";
    if (!archivo) return;

    if (!TIPOS_ARTE.includes(archivo.type)) {
      setErrorArte("Formato de imagen no admitido. Usá JPG, PNG o WEBP.");
      return;
    }
    if (archivo.size > MAX_ARTE_BYTES) {
      setErrorArte("La imagen debe pesar como máximo 15MB.");
      return;
    }
    setErrorArte(null);
    onSubirArte?.(archivo);
  }

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
    // SI HAY destino; la ruta real la resuelve el backend al leer. Y es lo
    // ÚNICO que decide si el slide dibuja la señal del CTA: el copy es fijo en
    // `SlideCampania` desde el 06/09/2026.
    ctaDestino: valores.modalCtaTipo ? "#" : null,
    // El arte SÍ sale de `campania` y no de `valores`: se sube por su propio
    // endpoint (`onSubirArte`) y queda persistido EN EL ACTO — `cambiarArte`
    // reescribe `campania` con la respuesta del PUT apenas termina la subida.
    // No hay ningún campo de formulario que lo sostenga mientras tanto, así
    // que acá no hace falta (ni corresponde) leer un valor "todavía no
    // guardado".
    arteUrl: campania?.bannerArteUrl ?? null,
    doodleUrl: campania?.doodleUrl ?? null,
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
            {avisoTitulo ? (
              <p className="font-body-sm text-body-sm mt-1 text-error">{avisoTitulo}</p>
            ) : null}
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
            {avisoTexto ? (
              <p className="font-body-sm text-body-sm mt-1 text-error">{avisoTexto}</p>
            ) : null}
          </div>

          {/* El bloque se muestra SIEMPRE; en el alta espera. Sube a
              `PUT /:id/arte`, así que no puede operar hasta que la campaña
              exista — mismo patrón que el Doodle de `SeccionCampania`. */}
          <div className="rounded-lg border border-outline-variant p-4">
            <h3 className="font-label-md text-label-md mb-3 uppercase tracking-widest text-on-surface-variant">
              Arte del slide
            </h3>
            {esEdicion ? (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  {campania?.bannerArteUrl ? (
                    <img
                      src={campania.bannerArteUrl}
                      alt={`Arte del slide de ${campania.nombre}`}
                      onLoad={(e) =>
                        setAvisoArte(
                          avisoProporcionArte(
                            e.currentTarget.naturalWidth,
                            e.currentTarget.naturalHeight,
                          ),
                        )
                      }
                      className="h-16 w-auto rounded-lg bg-surface-container p-2"
                    />
                  ) : (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Sin arte: el slide sale con el color de la marca y el copy encima.
                    </p>
                  )}

                  <input
                    ref={inputArte}
                    type="file"
                    aria-label={campania?.bannerArteUrl ? "Reemplazar arte del slide" : "Subir arte del slide"}
                    accept={TIPOS_ARTE.join(",")}
                    onChange={elegirArte}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => inputArte.current?.click()}
                    className={claseAccionArte}
                  >
                    {campania?.bannerArteUrl ? "Reemplazar" : "Subir arte"}
                  </button>
                  {campania?.bannerArteUrl ? (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={onQuitarArte}
                      className={claseAccionArte}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                {errorArte ? (
                  <p className="font-body-sm text-body-sm mt-3 rounded-lg bg-error-container px-3 py-2 text-on-error-container">
                    {errorArte}
                  </p>
                ) : null}
                {/* La medida sugerida va SIEMPRE, no solo cuando algo sale mal:
                    es más barato acertar la pieza que descubrir el recorte en
                    la home. El aviso de abajo aparece cuando la que ya está
                    guardada no da. */}
                <p className="font-body-sm text-body-sm mt-3 text-on-surface-variant">
                  El slide es una franja apaisada. Medida recomendada:{" "}
                  <strong>{MEDIDA_SUGERIDA}</strong>. El copy se lee sobre el tercio izquierdo,
                  así que dejá esa zona despejada.
                </p>
                {avisoArte ? (
                  <p className="font-body-sm text-body-sm mt-2 rounded-lg bg-tertiary-container px-3 py-2 text-on-tertiary-container">
                    {avisoArte}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="font-body-md text-body-md flex items-start gap-2 text-on-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  lock
                </span>
                Guardá la campaña para subir el arte.
              </p>
            )}
          </div>
        </div>

        <PreviewBanner slide={slidePreview} />
      </div>
    </section>
  );
}

/**
 * `min-h-11` (44px) va ADEMÁS del `py-2`, no en lugar de él: el mínimo táctil de
 * WCAG 2.5.8 es un PISO y el padding sigue decidiendo cuánto crece por encima
 * (mismo criterio que `SelectorCantidad.jsx`).
 *
 * ⚠️ **Esta pantalla se le escapó al barrido de la auditoría táctil**: el editor
 * de campaña es una RUTA propia (`/catalogo/admin/campanias/:id/editar`) a la que
 * "Nueva campaña" NAVEGA, y este bloque solo se renderiza en modo EDICIÓN —sube a
 * `PUT /:id/arte` y no hay id en el alta—, así que ni el recorrido del listado ni
 * la ruta `/campanias/nueva` llegaban a medirlo. Medido recién el 07/09/2026 a
 * 1280×800 con `elementFromPoint` —el área EFECTIVA, no la caja declarada—:
 * "Reemplazar" daba 93×33 y "Quitar" 86×33. El ancho ya sobraba; faltaba el ALTO.
 *
 * Crecen de verdad en vez de usar el pseudo-elemento de `utils/areaTactil.js`:
 * viven en un `flex flex-wrap items-center gap-4` que se reacomoda solo, así que
 * agrandar la caja no desalinea nada ni pisa a los vecinos.
 */
const claseAccionArte =
  "font-label-sm text-label-sm min-h-11 rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60";
