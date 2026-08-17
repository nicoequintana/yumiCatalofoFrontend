/**
 * Small uppercase pill label for a product's `etiqueta`.
 *
 * Hidden by user request: `etiqueta` stays in the data model and the admin
 * form (so it can be re-enabled later without a data migration), but the
 * badge is not rendered anywhere in the UI. Kept as a component (rather
 * than removing all 4 call sites) so re-enabling is a one-line revert here.
 */
function Badge() {
  return null;
}

export default Badge;
