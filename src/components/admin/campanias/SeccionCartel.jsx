import Interruptor from "./Interruptor.jsx";
import PreviewCartel from "./PreviewCartel.jsx";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";

/**
 * El cartel que interrumpe al visitante cuando entra al catálogo.
 *
 * CAMPOS A LA IZQUIERDA, PREVIEW A LA DERECHA — el mismo reparto que el editor
 * de producto. Este cartel se le muestra a todo el mundo y no hay forma de
 * juzgar un título de 22px leyendo un `<input>`: hay que verlo puesto.
 *
 * Los campos se muestran SIEMPRE, no solo con el cartel prendido: se puede
 * escribir con calma y prenderlo después. El backend solo exige el título
 * cuando está activo.
 *
 * EL CONTADOR. `{dias}` es un marcador que el admin escribe en el texto; el
 * número lo cuenta el BACKEND y llega ya resuelto en `diasFaltantes`. El
 * frontend solo sustituye, que es presentación.
 *
 * ⚠️ El placeholder del botón sale de `opciones.ctaTextoPorDefecto`, nunca de
 * una constante local: un placeholder hecho a mano divergiría del texto que el
 * cartel realmente muestra, sin error y sin test rojo.
 */
export default function SeccionCartel({
  valores,
  editar,
  opciones,
  campania,
  diasFaltantes,
}) {
  // Lo que va a ver el visitante, armado con lo que hay tipeado AHORA.
  const modalPreview = {
    doodleUrl: campania?.doodleUrl ?? null,
    titulo: valores.modalTitulo || "Título del cartel",
    texto: valores.modalTexto,
    diasFaltantes,
    // `CartelCampania` pinta el botón cuando hay destino. Con `interactivo`
    // apagado el valor nunca se navega —se dibuja un `<span>`, no un `<Link>`—,
    // así que acá alcanza con decir SI HAY botón. La ruta real la resuelve el
    // backend al leer, contra lo que exista ese día.
    ctaDestino: valores.modalCtaTipo ? "#" : null,
    ctaTexto: valores.modalCtaTexto.trim() || opciones?.ctaTextoPorDefecto || "",
  };

  return (
    <section
      aria-labelledby="titulo-seccion-cartel"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <h2 id="titulo-seccion-cartel" className="font-headline-sm text-headline-sm mb-5 text-primary">
        Cartel
      </h2>

      <div className="mb-5">
        <Interruptor
          etiqueta="Mostrar cada vez que alguien entra al catálogo"
          activo={valores.modalActivo}
          onCambiar={(valor) => editar("modalActivo", valor)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="campania-modal-titulo" className={claseEtiqueta}>
              Título
            </label>
            <input
              id="campania-modal-titulo"
              type="text"
              maxLength={120}
              value={valores.modalTitulo}
              onChange={(e) => editar("modalTitulo", e.target.value)}
              className={claseCampo}
              placeholder="Llega la primavera"
            />
          </div>

          <div>
            <label htmlFor="campania-modal-texto" className={claseEtiqueta}>
              Texto{" "}
              <span className="normal-case tracking-normal">
                · <code className="text-secondary">{"{dias}"}</code> pone el contador
              </span>
            </label>
            <textarea
              id="campania-modal-texto"
              rows={3}
              maxLength={1000}
              value={valores.modalTexto}
              onChange={(e) => editar("modalTexto", e.target.value)}
              className={claseCampo}
              placeholder="Faltan {dias} días para la Primavera."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="campania-modal-objetivo" className={claseEtiqueta}>
                Cuenta hasta <span className="normal-case tracking-normal">· opcional</span>
              </label>
              <input
                id="campania-modal-objetivo"
                type="date"
                value={valores.modalFechaObjetivo}
                onChange={(e) => editar("modalFechaObjetivo", e.target.value)}
                className={claseCampo}
              />
            </div>
            <div>
              <label htmlFor="campania-modal-cta" className={claseEtiqueta}>
                Botón
              </label>
              <input
                id="campania-modal-cta"
                type="text"
                maxLength={60}
                value={valores.modalCtaTexto}
                onChange={(e) => editar("modalCtaTexto", e.target.value)}
                className={claseCampo}
                placeholder={opciones?.ctaTextoPorDefecto ?? ""}
              />
            </div>
          </div>
        </div>

        <PreviewCartel modal={modalPreview} />
      </div>
    </section>
  );
}
