/**
 * Small uppercase pill label, shared by two independent, unrelated flags:
 *
 * - `etiqueta` ("Nuevo", "Best Seller", etc.): hidden by explicit user
 *   request. Stays in the data model and the admin form (so it can be
 *   re-enabled later without a data migration), but intentionally never
 *   renders — passing only `etiqueta` always yields `null`. This behavior
 *   predates `disponibilidad` and must not change as a side effect of
 *   reusing this component for it.
 * - `disponibilidad` (Sprint 3, `AGOTADO` only): opt-in via an explicit
 *   separate prop, NOT routed through the same hidden `etiqueta` path — a
 *   product being out of stock is real merchandising information the admin
 *   needs visible, unlike the disabled `etiqueta` chip.
 */
function Badge({ etiqueta, disponibilidad }) {
  if (disponibilidad === "AGOTADO") {
    return (
      <span className="font-label-sm text-label-sm rounded bg-error-container px-2 py-1 uppercase tracking-wide text-on-error-container">
        Agotado
      </span>
    );
  }

  // `etiqueta` intentionally stays hidden (see doc comment above) — accepted
  // as a prop only so existing call sites don't need to change.
  void etiqueta;
  return null;
}

export default Badge;
