import { Link } from "react-router-dom";
import Badge from "./Badge.jsx";
import BotonFavorito from "./BotonFavorito.jsx";
import { formatPrecio } from "../utils/formato.js";

/**
 * Single card component for the `/` product grid, per design D2.
 *
 * `variant: "vertical" | "horizontal"` switches between catalogo.html's
 * stacked layout (L131-145) and its `sm:flex-row` wide layout (L179-209).
 * Both share the same shell (`bg-surface-container-lowest rounded-xl
 * shadow-ambient p-6 relative group`), the same
 * `Badge`, and the same title/desc/price block. Grid spans (`md:col-span-*`)
 * are intentionally NOT set here — they belong to the parent page's grid.
 */
function ProductCard({ producto, variant = "vertical" }) {
  const foto = producto.fotos?.[0];
  const href = `/producto/${producto.id}`;

  const shell = "bg-surface-container-lowest rounded-xl shadow-ambient p-6 relative group flex flex-col h-full";

  if (variant === "horizontal") {
    return (
      <Link to={href} className={`${shell} sm:flex-row`}>
        <Badge etiqueta={producto.etiqueta} className="absolute top-6 left-6 z-10" />
        <BotonFavorito productoId={producto.id} className="absolute top-6 right-6 z-10" />
        <div className="mb-6 flex h-64 w-full items-center justify-center pr-0 sm:mb-0 sm:h-auto sm:w-1/2 sm:pr-6">
          {foto ? (
            <img
              className="h-full max-h-64 w-full object-contain"
              src={foto.url}
              alt={producto.nombre}
            />
          ) : null}
        </div>
        <div className="flex w-full flex-col justify-center sm:w-1/2">
          <h3 className="font-headline-md text-headline-md mb-2 text-primary">{producto.nombre}</h3>
          <p className="font-body-md text-body-md mb-6 text-on-surface-variant">{producto.descripcion}</p>
          <div className="mt-auto flex items-center justify-between">
            <span className="font-headline-md text-headline-md text-primary">
              {formatPrecio(producto.precio)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={href} className={shell}>
      <Badge etiqueta={producto.etiqueta} className="absolute top-6 left-6 z-10" />
      <BotonFavorito productoId={producto.id} className="absolute top-6 right-6 z-10" />
      <div className="mb-6 flex h-64 flex-grow items-center justify-center">
        {foto ? (
          <img
            className="h-full w-full object-contain object-fit"
            src={foto.url}
            alt={producto.nombre}
          />
        ) : null}
      </div>
      <div className="text-center">
        <h3 className="font-headline-md text-headline-md mb-2 text-primary">{producto.nombre}</h3>
        <p className="font-body-md text-body-md mb-4 text-on-surface-variant">{producto.descripcion}</p>
        <div className="flex items-end justify-between">
          <span className="font-headline-md text-headline-md text-primary">
            {formatPrecio(producto.precio)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
