/**
 * Las dos tarjetas de confianza del pie de la home (mockup `.confianza`).
 *
 * ⚠️ COPY PROVISIONAL: el texto final se confirma con el negocio antes de
 * publicar (spec 2026-09-13-rediseno-home-publica). No nombra transportistas
 * ni ubicaciones a propósito — no hay dato que respalde esa promesa.
 *
 * `tono` elige un par fondo/ícono de tokens semánticos (el mockup usa los
 * `*-fixed`, que la paleta pública no tiene: se aproximan con alfa del token).
 */
const TARJETAS_CONFIANZA = [
  {
    icono: "local_shipping",
    tono: "bg-primary/10 text-primary",
    titulo: "Envíos a todo el país",
    texto: "Despachamos tu pedido y te pasamos el seguimiento para que sepas dónde está.",
  },
  {
    icono: "chat",
    tono: "bg-tertiary/10 text-tertiary",
    titulo: "Atención personalizada",
    texto: "Consultas antes y después de tu compra, directo por WhatsApp con nuestro equipo.",
  },
];

export default function Confianza() {
  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12">
      {/* h2 oculto: sin él las tarjetas (h3) colgarían, en el árbol de
          encabezados, del h2 de la sección anterior. */}
      <h2 className="sr-only">Comprá con confianza</h2>
      <div className="grid gap-3 md:grid-cols-2 md:gap-6">
        {TARJETAS_CONFIANZA.map((tarjeta) => (
          <div key={tarjeta.titulo} className="flex items-start gap-3.5 rounded-2xl bg-surface-container-low p-[18px] md:p-6">
            <span
              aria-hidden="true"
              className={`material-symbols-outlined grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl text-[24px] ${tarjeta.tono}`}
            >
              {tarjeta.icono}
            </span>
            <div>
              <h3 className="font-headline-sm text-[16px] font-semibold leading-[22px] text-primary md:text-[18px]">
                {tarjeta.titulo}
              </h3>
              <p className="mt-0.5 font-body-md text-[13px] leading-[19px] text-on-surface-variant md:text-[14px] md:leading-[21px]">
                {tarjeta.texto}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
