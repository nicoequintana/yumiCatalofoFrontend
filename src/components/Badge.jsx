/**
 * Pill en mayúsculas con la `etiqueta` del producto ("Nuevo", "Best Seller").
 *
 * El color llega YA RESUELTO del backend, en canales (`"46 125 50"`), y se
 * aplica con `style` inline: el color sale de una paleta de 20 y el JIT de
 * Tailwind purga cualquier clase que no vea escrita literal, así que no puede
 * ser una utilidad armada al vuelo. La paleta vive en una sola casa
 * (`backend/src/lib/coloresEtiqueta.js`); acá no hay copia.
 *
 * Sin `colorFondo` cae a `bg-tertiary`, el color con el que este chip se
 * dibujó siempre en la ficha — eso es lo que significa `color: null` en la
 * base, y es lo que dejó la migración sin ninguna regresión visual.
 *
 * ⚠️ El chip de `ProductCard` usa OTRO token por defecto
 * (`bg-secondary-container`). Son dos superficies distintas y siguen
 * difiriendo a propósito; unificarlas sería un cambio de diseño, no una
 * corrección.
 */
function Badge({ etiqueta }) {
  if (!etiqueta) return null;

  const estilo = etiqueta.colorFondo
    ? {
        backgroundColor: `rgb(${etiqueta.colorFondo})`,
        color: `rgb(${etiqueta.colorTexto})`,
      }
    : undefined;

  return (
    <span
      style={estilo}
      className={`font-label-sm text-label-sm inline-flex items-center rounded-full px-3 py-1 uppercase tracking-wide ${
        etiqueta.colorFondo ? "" : "bg-tertiary text-on-tertiary"
      }`}
    >
      {etiqueta.nombre}
    </span>
  );
}

export default Badge;
