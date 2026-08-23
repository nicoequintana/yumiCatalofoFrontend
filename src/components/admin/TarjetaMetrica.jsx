/**
 * Tarjeta de métrica principal de las pantallas de analytics: ícono + etiqueta
 * en eyebrow, el valor en grande y un detalle opcional debajo.
 *
 * `testId` es opcional: solo lo pasan las tarjetas cuyo contenido depende de
 * una regla de negocio que un test necesita señalar sin ambigüedad (por
 * ejemplo el "tiempo entre compras" de clientes, que puede ser `null`).
 *
 * @param {{icono: string, etiqueta: string, valor: React.ReactNode, detalle?: React.ReactNode, testId?: string}} props
 */
function TarjetaMetrica({ icono, etiqueta, valor, detalle, testId }) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-5 shadow-ambient"
    >
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[20px]">{icono}</span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest">
          {etiqueta}
        </span>
      </div>
      <span className="font-headline-md text-headline-md break-words text-on-surface">
        {valor}
      </span>
      {detalle ? (
        <span className="font-body-md text-body-md text-on-surface-variant">
          {detalle}
        </span>
      ) : null}
    </div>
  );
}

export default TarjetaMetrica;
