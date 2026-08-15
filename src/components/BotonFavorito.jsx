import useFavoritos from "../hooks/useFavoritos.js";

/**
 * Heart toggle for a product — outline when not favorited, filled when it
 * is. Used inside both ProductCard (which is itself a clickable <Link>) and
 * the product detail page. `event.stopPropagation()` + `preventDefault()`
 * are required when nested inside a Link so tapping the heart doesn't also
 * navigate to the product page.
 */
function BotonFavorito({ productoId, className = "" }) {
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
      className={`inline-flex items-center justify-center p-1.5 text-on-surface-variant hover:text-error ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[22px] ${favorito ? "text-error" : ""}`}
        style={favorito ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        favorite
      </span>
    </button>
  );
}

export default BotonFavorito;
