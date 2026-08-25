import useFavoritos from "../hooks/useFavoritos.js";

/**
 * Heart toggle for a product — outline when not favorited, filled when it
 * is. Used inside both ProductCard (which is itself a clickable <Link>) and
 * the product detail page. `event.stopPropagation()` + `preventDefault()`
 * are required when nested inside a Link so tapping the heart doesn't also
 * navigate to the product page.
 *
 * `textoGuardar` is optional label text shown next to the icon (e.g.
 * "Guardar" in the ProductoDetalle hero's outline button) — omitted, it
 * stays the icon-only toggle used everywhere else (ProductCard, etc.).
 */
function BotonFavorito({ productoId, className = "", textoGuardar }) {
  const { esFavorito, toggleFavorito } = useFavoritos();
  const favorito = esFavorito(productoId);

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorito(productoId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={favorito}
      className={`inline-flex items-center justify-center gap-2 text-on-surface-variant ${
        textoGuardar ? "h-10 px-3" : "p-1.5"
      } ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[22px] ${favorito ? "text-error" : ""}`}
        style={favorito ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        favorite
      </span>
      {textoGuardar ? (
        <span className="font-label-md text-label-md uppercase tracking-wide">
          {favorito ? "Guardado" : textoGuardar}
        </span>
      ) : null}
    </button>
  );
}

export default BotonFavorito;
