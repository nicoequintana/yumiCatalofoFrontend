/**
 * Small uppercase pill label for `etiqueta` ("Nuevo", "Best Seller", etc.).
 * Re-enabled as part of the "Vibrant Editorial Discovery" redesign — the
 * product detail hero now shows it as a golden-sand (`tertiary`) pill, same
 * visual language as ProductCard's own inline etiqueta chip, which already
 * rendered it independently of this component. Renders nothing when there's
 * no etiqueta.
 */
function Badge({ etiqueta }) {
  if (!etiqueta) return null;

  return (
    <span className="font-label-sm text-label-sm inline-flex items-center rounded-full bg-tertiary px-3 py-1 uppercase tracking-wide text-on-tertiary">
      {etiqueta}
    </span>
  );
}

export default Badge;
