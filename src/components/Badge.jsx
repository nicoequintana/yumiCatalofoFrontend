/**
 * Small uppercase pill label, shared by two independent, unrelated flags —
 * both intentionally dead on the public frontend:
 *
 * - `etiqueta` ("Nuevo", "Best Seller", etc.): hidden by explicit user
 *   request. Stays in the data model and the admin form (so it can be
 *   re-enabled later without a data migration), but intentionally never
 *   renders — passing only `etiqueta` always yields `null`. This behavior
 *   predates `disponibilidad` and must not change as a side effect of
 *   reusing this component for it.
 * - `disponibilidad` (Sprint 3, `AGOTADO` only): originally rendered an
 *   "Agotado" pill whenever `disponibilidad === "AGOTADO"`. Hidden as of a
 *   deliberate product-decision correction: there is no real stock-
 *   management workflow yet (the admin has no reliable way to keep
 *   `disponibilidad` accurate day to day), so it must not be a visible
 *   public signal until that workflow exists — "esa información es del
 *   admin" (explicit user decision). The prop is still accepted and still
 *   passed by `ProductCard.jsx`/`ProductoDetalle.jsx` so call sites don't
 *   need to change, and the field/logic stays intact so this can be
 *   re-enabled later without a data migration — only the render path is
 *   disabled, same pattern as `etiqueta` above.
 */
function Badge({ etiqueta, disponibilidad }) {
  // Both flags intentionally stay hidden (see doc comment above) — accepted
  // as props only so existing call sites don't need to change.
  void etiqueta;
  void disponibilidad;
  return null;
}

export default Badge;
