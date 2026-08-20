/**
 * Reusable empty/loading/not-found state — centered icon + message.
 * Used by the admin product list (no products yet) and the product detail
 * page (id doesn't resolve), per design's Interfaces/Contracts section.
 */
function EstadoVacio({ icono = "inventory_2", titulo, mensaje }) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant">{icono}</span>
      {titulo ? (
        <h2 className="font-headline-md text-headline-md text-primary">{titulo}</h2>
      ) : null}
      {mensaje ? (
        <p className="font-body-md text-body-md max-w-md text-on-surface-variant">{mensaje}</p>
      ) : null}
    </div>
  );
}

export default EstadoVacio;
