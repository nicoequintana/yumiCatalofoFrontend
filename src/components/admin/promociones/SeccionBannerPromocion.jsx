import { useEffect, useRef, useState } from "react";
import Interruptor from "../campanias/Interruptor.jsx";
import PreviewBanner from "../campanias/PreviewBanner.jsx";
import { MUESTRA_COLOR } from "../campanias/muestraColor.js";
import { MEDIDA_SUGERIDA, avisoProporcionArte } from "../campanias/proporcionArte.js";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";

/**
 * La sección Banner del editor de UNA promoción — mismo slide que ve el
 * carrusel de la home, con `tipo: "PROMOCION"`.
 *
 * Es el espejo de `SeccionBanner.jsx` (campañas), con tres diferencias de
 * fondo (Task 8 del banner de promoción):
 *
 * 1. **Sin selector de destino.** Campañas resuelve el CTA contra
 *    `modalCtaTipo`; acá el destino lo arma el backend con el id de la
 *    promoción (`/coleccion?promocion=<id>`, ver `aSlidePromocion` en
 *    `campanias.controller.js`) y no hay nada que elegir.
 * 2. El aviso del marcador `{dias}` usa el MISMO copy —carácter por
 *    carácter— que `exigirSinMarcadorDeDias` de
 *    `promociones.controller.js`, que dice "del cartel de campañas" (no solo
 *    "del cartel", como el de campañas): es sincronización manual y va al
 *    censo de `CLAUDE.md`.
 * 3. El preview usa `SlideCampania`, el mismo componente del carrusel real.
 *
 * ⚠️ **A diferencia de campañas, acá el backend valida el marcador en TRES
 * campos y no dos**: además de `bannerTitulo`/`bannerTexto`,
 * `promociones.controller.js` también rechaza `{dias}` en `bannerCtaTexto`
 * (campañas no lo hace). El aviso de acá cubre los tres, siguiendo el
 * contrato real y no una copia literal de campañas.
 *
 * **A diferencia de `SeccionBanner`, no hay modo "alta sin guardar".** Esta
 * sección solo se monta con una promoción ya `abierta` en
 * `AdminPromociones.jsx`, y una promoción SIEMPRE tiene id desde que se crea
 * (nace con `POST /promociones`, antes de que exista ningún editor donde
 * montar esto) — así que el bloque de arte está siempre disponible, sin el
 * candado que campañas necesita para su alta.
 *
 * El estado del formulario es LOCAL (no hay un `useCampaniaEditor` que lo
 * levante): `promocion`/`onGuardar` son la interfaz completa, como
 * `EditorPromocion` con sus `porcentajes`. Se reinicia solo cuando cambia
 * `promocion.id` — cambiar de promoción abierta no puede arrastrar los
 * borradores de la anterior.
 */

const PLACEHOLDER_TITULO = "Semana del Hogar";

const MARCADOR_DIAS = /\{dias\}/i;

/** Copia EXACTA de `exigirSinMarcadorDeDias` en `promociones.controller.js`. */
function avisoMarcadorDias(texto, campo) {
  if (!texto || !MARCADOR_DIAS.test(texto)) return null;
  return `El contador \`{dias}\` es del cartel de campañas, no del banner. Sacalo de \`${campo}\` o escribí los días a mano.`;
}

/** Tipos y peso máximo del arte, espejados del backend — mismo freno que `SeccionBanner`. */
const TIPOS_ARTE = ["image/jpeg", "image/png", "image/webp"];
const MAX_ARTE_BYTES = 15 * 1024 * 1024;

function valoresIniciales(promocion) {
  return {
    bannerEnHome: promocion?.bannerEnHome ?? false,
    bannerTitulo: promocion?.bannerTitulo ?? "",
    bannerTexto: promocion?.bannerTexto ?? "",
    bannerCtaTexto: promocion?.bannerCtaTexto ?? "",
    // `null` y no una de las cinco opciones: una promoción que todavía no
    // eligió color no "es" TERRACOTA, el default lo aplica el backend AL LEER
    // — mismo criterio que `bannerColor` en `useCampaniaEditor`.
    bannerColor: promocion?.bannerColor ?? null,
  };
}

export default function SeccionBannerPromocion({
  promocion,
  colores = [],
  ctaTextoPorDefecto,
  guardando,
  onGuardar,
  onSubirArte,
  onQuitarArte,
}) {
  const [valores, setValores] = useState(() => valoresIniciales(promocion));
  const [errorArte, setErrorArte] = useState(null);
  // La proporción del arte YA guardado: se mide al cargar la miniatura,
  // porque es la pieza que está en producción ahora mismo.
  const [avisoArte, setAvisoArte] = useState(null);
  const inputArte = useRef(null);

  // Cambiar de promoción abierta no puede arrastrar un borrador sin guardar
  // de la anterior — mismo criterio que `EditorPromocion` con `porcentajes`.
  // Deliberadamente solo `promocion?.id` en las deps: si `promocion` entrara
  // entera, cualquier reescritura del objeto (ítems guardados, arte subido)
  // pisaría un cambio de banner sin guardar todavía.
  useEffect(() => {
    setValores(valoresIniciales(promocion));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promocion?.id]);

  const avisoTitulo = avisoMarcadorDias(valores.bannerTitulo, "bannerTitulo");
  const avisoTexto = avisoMarcadorDias(valores.bannerTexto, "bannerTexto");
  const avisoCta = avisoMarcadorDias(valores.bannerCtaTexto, "bannerCtaTexto");

  function editar(campo, valor) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function guardar() {
    onGuardar?.({
      bannerEnHome: valores.bannerEnHome,
      bannerTitulo: valores.bannerTitulo.trim() || null,
      bannerTexto: valores.bannerTexto.trim() || null,
      bannerCtaTexto: valores.bannerCtaTexto.trim() || null,
      bannerColor: valores.bannerColor,
    });
  }

  /**
   * Valida tipo y tamaño ANTES de subir. Es una cortesía, no la defensa: el
   * backend valida magic bytes sobre el contenido real del archivo.
   */
  function elegirArte(evento) {
    const archivo = evento.target.files?.[0];
    // Se limpia SIEMPRE, así reintentar con el mismo archivo vuelve a
    // disparar el change.
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
  // `aSlidePromocion` — con `ctaTexto`/`ctaDestino` SIEMPRE presentes (a
  // diferencia del banner de campaña, una promoción no tiene "sin botón": el
  // destino sale del id, no de una elección).
  const slidePreview = {
    tipo: "PROMOCION",
    campaniaId: null,
    promocionId: promocion?.id ?? null,
    titulo: valores.bannerTitulo || PLACEHOLDER_TITULO,
    texto: valores.bannerTexto,
    ctaDestino: promocion?.id ? "#" : null,
    ctaTexto: valores.bannerCtaTexto.trim() || ctaTextoPorDefecto || "",
    // El arte sale de `promocion` y no de `valores`: se sube por su propio
    // endpoint (`onSubirArte`) y queda persistido EN EL ACTO, mismo criterio
    // que `SeccionBanner`.
    arteUrl: promocion?.bannerArteUrl ?? null,
    doodleUrl: null,
    color: valores.bannerColor,
  };

  return (
    <section
      aria-labelledby="titulo-seccion-banner-promocion"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <h2
        id="titulo-seccion-banner-promocion"
        className="font-headline-sm text-headline-sm mb-1 text-primary"
      >
        Banner de la home
      </h2>
      <p className="font-body-sm text-body-sm mb-5 text-on-surface-variant">
        El botón siempre lleva a los productos de esta promoción — acá no se elige a dónde va.
      </p>

      <div className="mb-5">
        <Interruptor
          etiqueta="Mostrar en la home mientras la promoción esté activa"
          activo={valores.bannerEnHome}
          onCambiar={(valor) => editar("bannerEnHome", valor)}
          disabled={guardando}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="promocion-banner-titulo" className={claseEtiqueta}>
              Título del banner
            </label>
            <input
              id="promocion-banner-titulo"
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
            <label htmlFor="promocion-banner-texto" className={claseEtiqueta}>
              Texto del banner <span className="normal-case tracking-normal">· máx. 200</span>
            </label>
            <textarea
              id="promocion-banner-texto"
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

          <div>
            <label htmlFor="promocion-banner-cta" className={claseEtiqueta}>
              Texto del botón del banner
            </label>
            <input
              id="promocion-banner-cta"
              type="text"
              maxLength={60}
              value={valores.bannerCtaTexto}
              onChange={(e) => editar("bannerCtaTexto", e.target.value)}
              className={claseCampo}
              placeholder={ctaTextoPorDefecto ?? ""}
            />
            {avisoCta ? (
              <p className="font-body-sm text-body-sm mt-1 text-error">{avisoCta}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="promocion-banner-color" className={claseEtiqueta}>
              Color del slide
            </label>
            {/* Los valores salen de `colores` (`coloresSlide` de
                `GET /campanias/opciones`), que emite el backend. El panel NO
                tiene copia: un diccionario duplicado a mano falla mudo. */}
            <div className="flex items-center gap-3">
              <select
                id="promocion-banner-color"
                value={valores.bannerColor ?? ""}
                onChange={(e) => editar("bannerColor", e.target.value)}
                className={claseCampo}
              >
                <option value="" disabled>
                  Elegí un color
                </option>
                {colores.map((color) => (
                  <option key={color.valor} value={color.valor}>
                    {color.etiqueta}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className={`h-8 w-8 shrink-0 rounded-full ${
                  MUESTRA_COLOR[valores.bannerColor] ?? MUESTRA_COLOR.TERRACOTA
                }`}
              />
            </div>
          </div>

          {/* El arte sube a `PUT /promociones/:id/arte`. A diferencia de
              campañas, esta sección solo existe con una promoción que ya
              tiene id, así que no hace falta ningún candado de "guardá
              primero". */}
          <div className="rounded-lg border border-outline-variant p-4">
            <h3 className="font-label-md text-label-md mb-3 uppercase tracking-widest text-on-surface-variant">
              Arte del slide
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              {promocion?.bannerArteUrl ? (
                <img
                  src={promocion.bannerArteUrl}
                  alt={`Arte del slide de ${promocion.nombre}`}
                  onLoad={(e) =>
                    setAvisoArte(
                      avisoProporcionArte(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight),
                    )
                  }
                  className="h-16 w-auto rounded-lg bg-surface-container p-2"
                />
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Sin arte: el slide sale solo con el color de fondo.
                </p>
              )}

              <input
                ref={inputArte}
                type="file"
                aria-label={promocion?.bannerArteUrl ? "Reemplazar arte del slide" : "Subir arte del slide"}
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
                {promocion?.bannerArteUrl ? "Reemplazar" : "Subir arte"}
              </button>
              {promocion?.bannerArteUrl ? (
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
            {/* La medida sugerida va SIEMPRE, no solo cuando algo sale mal: es
                más barato acertar la pieza que descubrir el recorte en la home.
                El aviso de abajo aparece cuando la que ya está guardada no da. */}
            <p className="font-body-sm text-body-sm mt-3 text-on-surface-variant">
              El slide es una franja apaisada. Medida recomendada: <strong>{MEDIDA_SUGERIDA}</strong>.
              El copy se lee sobre el tercio izquierdo, así que dejá esa zona despejada.
            </p>
            {avisoArte ? (
              <p className="font-body-sm text-body-sm mt-2 rounded-lg bg-tertiary-container px-3 py-2 text-on-tertiary-container">
                {avisoArte}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={guardando}
              onClick={guardar}
              className="font-label-md text-label-md rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Guardar banner"}
            </button>
          </div>
        </div>

        <PreviewBanner slide={slidePreview} />
      </div>
    </section>
  );
}

const claseAccionArte =
  "font-label-sm text-label-sm rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60";
