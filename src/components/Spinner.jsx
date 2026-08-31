/**
 * Small inline loading spinner (design item 6) — pure CSS via Tailwind's
 * built-in animate-spin, no external animation library. This is a
 * functional loading indicator, not a decorative hover/idle animation, so
 * it's exempt from the "remove animations" cleanup in item 4.
 *
 * **`decorativo` decide si se anuncia o no, y no es un detalle de prolijidad.**
 *
 * Suelto —llenando una pantalla mientras carga— su `role="status"` y su
 * `aria-label` son lo único que le dice a un lector de pantalla que hay algo en
 * curso. Por eso el default es anunciarse.
 *
 * Dentro de un `<button>` que ADEMÁS tiene texto, en cambio, el nombre accesible
 * del botón se arma concatenando todo lo que hay adentro: el rótulo del spinner
 * no reemplaza al texto, se le suma, y el botón pasa a anunciarse como
 * *"CargandoGuardando…"*. Ahí el estado ya lo dice el texto y el spinner es
 * puramente visual — para eso está `decorativo`.
 *
 * @param {string} [className]
 * @param {boolean} [decorativo] `true` cuando algo de al lado ya anuncia el
 *   estado (un botón con su propio texto o `aria-label`)
 */
function Spinner({ className = "h-5 w-5", decorativo = false }) {
  return (
    <span
      // `aria-hidden` y sin `role`: los dos juntos, o el nodo sigue apareciendo
      // como un `status` sin nombre en el árbol de accesibilidad.
      {...(decorativo ? { "aria-hidden": "true" } : { role: "status", "aria-label": "Cargando" })}
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export default Spinner;
