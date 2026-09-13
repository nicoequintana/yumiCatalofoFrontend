import useCarrito from "../hooks/useCarrito.js";
import { useToast } from "../context/useToast.js";

const TEXTO_ESTADO = {
  disponible: "Agregar",
  sinStock: "Sin stock",
  tope: "Máximo en el carrito",
};

const ICONO_ESTADO = {
  disponible: "add_shopping_cart",
  sinStock: "block",
  tope: "check",
};

/**
 * Botón "Agregar" — HERMANO del `<Link>` de la tarjeta, nunca su hijo (mismo
 * motivo que `BotonFavorito`: un `<button>` dentro de un `<a>` es HTML
 * inválido y rompe el nombre accesible del enlace). Suma 1 unidad con
 * `useCarrito().agregar`. `useCarrito` NO valida stock — el tope lo aplica
 * este botón contra `producto.stock`.
 *
 * Un solo estado derivado (`estado`) decide texto, ícono y `disabled` — nunca
 * tres ternarios repitiendo la misma condición. `GET /products` (público)
 * filtra SIEMPRE `stock > 0` (ver `docs/reglas/productos.md`), así que un
 * `producto.stock` ausente o no numérico no debería pasar por acá en un uso
 * normal; si igual llega (objeto armado a mano, dato incompleto), se trata
 * como `sinStock` — la alternativa (dejar agregar sin tope real) vendería
 * stock que no se puede confirmar.
 */
function BotonAgregar({ producto, className = "" }) {
  const { carrito, agregar } = useCarrito();
  const { mostrarToast } = useToast();

  const enCarrito = carrito.find((linea) => linea.productId === producto.id)?.cantidad ?? 0;
  const stockDisponible = Number.isInteger(producto.stock) ? producto.stock : 0;
  const estado = stockDisponible <= 0 ? "sinStock" : enCarrito >= stockDisponible ? "tope" : "disponible";
  const deshabilitado = estado !== "disponible";

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
        {ICONO_ESTADO[estado]}
      </span>
      {TEXTO_ESTADO[estado]}
    </button>
  );
}

export default BotonAgregar;
