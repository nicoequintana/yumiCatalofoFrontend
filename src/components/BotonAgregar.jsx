import useCarrito from "../hooks/useCarrito.js";
import { useToast } from "../context/useToast.js";

/**
 * Botón "Agregar" — HERMANO del `<Link>` de la tarjeta, nunca su hijo (mismo
 * motivo que `BotonFavorito`: un `<button>` dentro de un `<a>` es HTML
 * inválido y rompe el nombre accesible del enlace). Suma 1 unidad con
 * `useCarrito().agregar`. `useCarrito` NO valida stock — el tope lo aplica
 * este botón contra `producto.stock`.
 */
function BotonAgregar({ producto, className = "" }) {
  const { carrito, agregar } = useCarrito();
  const { mostrarToast } = useToast();

  const enCarrito = carrito.find((linea) => linea.productId === producto.id)?.cantidad ?? 0;
  const sinStock = producto.stock === 0;
  const topeAlcanzado = !sinStock && producto.stock > 0 && enCarrito >= producto.stock;
  const deshabilitado = sinStock || topeAlcanzado;

  function handleClick(evento) {
    evento.preventDefault();
    evento.stopPropagation();
    if (deshabilitado) return;
    agregar(producto.id, 1);
    mostrarToast(`${producto.nombre} agregado al carrito`, {
      foto: producto.fotos?.[0] ? { url: producto.fotos[0].url, alt: producto.nombre } : null,
      accion: { texto: "Ver carrito", to: "/carrito" },
    });
  }

  const texto = sinStock ? "Sin stock" : topeAlcanzado ? "Máximo en el carrito" : "Agregar";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={deshabilitado}
      // ⚠️ `enabled:hover:*`, NO `hover:not-disabled:*`: ese último es la
      // sintaxis de variante compuesta de Tailwind v4 (`not-*`), y el
      // proyecto está en v3.4 (ver `package.json`) — v3 no reconoce
      // `not-disabled` como variante, la descarta en silencio (sin error, sin
      // CSS emitido) y el hover terminaba aplicándose SIEMPRE, disabled
      // incluido. `enabled:` sí existe desde v3.0 y es el idiom correcto acá.
      className={`flex h-9 items-center justify-center gap-1.5 rounded-full bg-surface-container-high font-label-md text-label-md text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-on-primary disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-outline md:h-11 ${className}`}
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
        {sinStock ? "block" : topeAlcanzado ? "check" : "add_shopping_cart"}
      </span>
      {texto}
    </button>
  );
}

export default BotonAgregar;
