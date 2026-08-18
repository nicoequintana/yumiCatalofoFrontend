import { Link } from "react-router-dom";
import BotonFavorito from "./BotonFavorito.jsx";
import { formatPrecio } from "../utils/formato.js";

/**
 * Single card component for the `/` product grid, per design D2.
 *
 * Marketplace-grid layout (Mercado Libre reference): square image tile,
 * floating favorite heart, an etiqueta chip anchored to the image's bottom
 * edge, then a compact text block (categoria eyebrow, 2-line clamped
 * nombre, large precio). `variant: "vertical" | "horizontal"` switches
 * between a stacked card and a wide `sm:flex-row` card for the grid's every
 * 4th slot; both share this same visual language. Grid spans
 * (`md:col-span-*`) stay in the parent page, not here.
 */
function ProductCard({ producto, variant = "vertical" }) {
  const foto = producto.fotos?.[0];
  const href = `/producto/${producto.id}`;

  const shell =
    "bg-surface-container-lowest rounded-xl shadow-ambient relative group flex flex-col h-full overflow-hidden transition-shadow hover:shadow-lg";

  const etiquetaChip = producto.etiqueta ? (
    <span className="font-label-sm text-label-sm absolute bottom-2 left-2 z-10 rounded bg-secondary-container px-2 py-1 uppercase tracking-wide text-on-secondary-container">
      {producto.etiqueta}
    </span>
  ) : null;

  const textoCategoria = producto.categoria?.nombre ? (
    <span className="font-label-sm text-label-sm mb-1 block truncate uppercase tracking-wide text-on-surface-variant">
      {producto.categoria.nombre}
    </span>
  ) : null;

  if (variant === "horizontal") {
    return (
      <Link to={href} className={`${shell} sm:flex-row`}>
        <div className="relative aspect-square w-full shrink-0 bg-surface-container-low sm:h-full sm:w-1/2">
          <BotonFavorito productoId={producto.id} className="absolute top-2 right-2 z-10 rounded-full bg-surface-container-lowest/90 shadow-sm" />
          {foto ? (
            <img className="h-full w-full object-cover" src={foto.url} alt={producto.nombre} />
          ) : null}
          {etiquetaChip}
        </div>
        <div className="flex w-full flex-col justify-center p-4 sm:w-1/2 sm:p-6">
          {textoCategoria}
          <h3 className="font-body-lg text-body-lg mb-2 line-clamp-2 text-on-surface">{producto.nombre}</h3>
          <span className="font-headline-md text-headline-md mt-auto text-primary">
            {formatPrecio(producto.precio)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link to={href} className={shell}>
      <div className="relative aspect-square w-full bg-surface-container-low">
        <BotonFavorito productoId={producto.id} className="absolute top-2 right-2 z-10 rounded-full bg-surface-container-lowest/90 shadow-sm" />
        {foto ? (
          <img className="h-full w-full object-cover" src={foto.url} alt={producto.nombre} />
        ) : null}
        {etiquetaChip}
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
