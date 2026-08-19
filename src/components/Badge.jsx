/**
 * Small uppercase pill label. `etiqueta` ("Nuevo", "Best Seller", etc.) is
 * hidden by explicit user request: it stays in the data model and the admin
 * form (so it can be re-enabled later without a data migration), but
 * intentionally never renders here — passing `etiqueta` always yields
 * `null`.
 */
function Badge({ etiqueta }) {
  void etiqueta;
  return null;
}

export default Badge;
