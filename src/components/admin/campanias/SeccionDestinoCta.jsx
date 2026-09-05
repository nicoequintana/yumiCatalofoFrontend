import SelectorDestinoCta from "./SelectorDestinoCta.jsx";

/**
 * A dónde manda esta campaña.
 *
 * Sección propia y no un bloque adentro del cartel, porque el destino es de la
 * CAMPAÑA: lo comparten el cartel y el banner de la home. Una campaña tiene un
 * solo lugar a donde mandar, y dos selectores serían dos verdades que se
 * desincronizan sin que nada falle.
 *
 * Además hay un motivo mecánico: `SelectorDestinoCta` tiene el `name` del grupo
 * de radios y los `id` de sus campos hardcodeados. Dos instancias en la misma
 * página compartirían el grupo —elegir en una desmarcaría la otra— y
 * duplicarían ids, rompiendo la asociación `<label htmlFor>`.
 *
 * ⚠️ Las columnas se siguen llamando `modalCtaTipo` / `modalCtaReferenciaId`
 * aunque ya no sean solo del modal. Renombrarlas es una migración de datos que
 * no compra nada; el nombre miente un poco y está documentado.
 */
export default function SeccionDestinoCta({
  valores,
  editar,
  editarDestinoCta,
  opciones,
  campania,
  guardando,
}) {
  const productos = campania?.productos ?? [];

  return (
    <section
      aria-labelledby="titulo-seccion-destino"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <h2
        id="titulo-seccion-destino"
        className="font-headline-sm text-headline-sm mb-1 text-primary"
      >
        Destino del botón
      </h2>
      <p className="font-body-sm text-body-sm mb-5 text-on-surface-variant">
        Lo usan el cartel y el banner de la home: los dos mandan al mismo lado.
      </p>

      <SelectorDestinoCta
        destinos={opciones?.destinos}
        tipo={valores.modalCtaTipo}
        referenciaId={valores.modalCtaReferenciaId}
        referenciaNombre={campania?.modalCtaReferencia?.nombre}
        cantidadEnVitrina={productos.length}
        onCambiarTipo={editarDestinoCta}
        onCambiarReferencia={(valor) => editar("modalCtaReferenciaId", valor)}
        disabled={guardando}
      />
    </section>
  );
}
