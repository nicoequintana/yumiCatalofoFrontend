import { Link } from "react-router-dom";
import BotonFavorito from "./BotonFavorito.jsx";
import { formatPrecio } from "../utils/formato.js";

/**
 * Single card component for the public product grids (`/coleccion`,
 * `/favoritos`, and the related-products strip in `FichaProducto`).
 *
 * Marketplace-grid layout (Mercado Libre reference): square image tile,
 * floating favorite heart, an etiqueta chip anchored to the image's bottom
 * edge, then a compact text block (categoria eyebrow, 2-line clamped
 * nombre, large precio).
 *
 * The card is stacked-only on purpose. A `variant: "horizontal"` used to
 * render a wide card on every 4th grid slot, which mixed two card shapes in
 * the same grid and read as broken rather than editorial. Every consumer now
 * lays the card out on a uniform grid, so the card owns its own vertical
 * shape and the parent page only owns the column count.
 */
function ProductCard({ producto }) {
  const foto = producto.fotos?.[0];
  const href = `/producto/${producto.id}`;

  const shell = `bg-surface-container-lowest rounded-xl shadow-ambient relative group flex flex-col h-full overflow-hidden transition-shadow hover:shadow-lg ${
    producto.destacado ? "ring-2 ring-secondary shadow-[0_0_24px_-8px_rgba(119,89,47,0.5)]" : ""
  }`;

  const destacadoChip = producto.destacado ? (
    <span className="font-label-sm text-label-sm absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-secondary px-2 py-1 uppercase tracking-wide text-on-primary">
      <span className="material-symbols-outlined text-[14px]">star</span>
      Destacado
    </span>
  ) : null;

  const etiquetaChip = producto.etiqueta ? (
    <span className="font-label-sm text-label-sm absolute bottom-2 left-2 z-10 rounded bg-secondary-container px-2 py-1 uppercase tracking-wide text-on-secondary-container">
      {producto.etiqueta}
    </span>
  ) : null;

  const pocoStockChip =
    producto.stock > 0 && producto.stock <= 3 ? (
      <span className="font-label-sm text-label-sm absolute bottom-2 right-2 z-10 rounded bg-error px-2 py-1 uppercase tracking-wide text-on-primary">
        Últimos {producto.stock}
      </span>
    ) : null;

  const textoCategoria = producto.categoria?.nombre ? (
    <span className="font-label-sm text-label-sm mb-1 block truncate uppercase tracking-wide text-on-surface-variant">
      {producto.categoria.nombre}
    </span>
  ) : null;

  return (
    <Link to={href} className={shell}>
      <div className="relative aspect-square w-full bg-surface-container-low">
        <BotonFavorito productoId={producto.id} className="absolute top-2 right-2 z-10 rounded-full bg-surface-container-lowest/90 shadow-sm" />
        {foto ? (
          <img
            className="h-full w-full object-cover"
            src={foto.url}
            alt={producto.nombre}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {destacadoChip}
        {etiquetaChip}
        {pocoStockChip}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {textoCategoria}
        <h3 className="font-body-lg text-body-lg mb-2 line-clamp-2 text-on-surface">{producto.nombre}</h3>
        <span className="font-headline-md text-headline-md mt-auto text-primary">
          {formatPrecio(producto.precio)}
        </span>
      </div>
    </Link>
  );
}

export default ProductCard;
