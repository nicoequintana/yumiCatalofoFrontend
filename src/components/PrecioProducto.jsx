import { formatPrecio } from "../utils/formato.js";
import { hayPromocion, precioAPagar } from "../utils/precioEfectivo.js";

/**
 * El precio de un producto, con su promoción si la tiene.
 *
 * **NO CALCULA NADA.** `precioEfectivo` y `descuento.porcentaje` llegan
 * resueltos del backend, que es la regla 1 del proyecto aplicada al dato que
 * más plata mueve: un cálculo de este lado sería el tercer espejo manual entre
 * repos, y el único que puede hacer que la vidriera prometa un precio distinto
 * del que la orden cobra.
 *
 * Lo usan la card, la ficha, el carrusel y el carrito. Un solo lugar donde
 * decidir cómo se ve una oferta — el pedido original ya avisa que ese diseño va
 * a cambiar, así que la lógica y la presentación viven separadas.
 *
 * JERARQUÍA: el precio que se PAGA es el principal y el anterior va tachado y
 * más chico. Invertirla haría que el cliente lea el precio viejo como el
 * vigente, que es peor que no mostrar la oferta.
 */

/** El precio de un producto, con su promoción si la tiene. */
export default function PrecioProducto({ producto, className = "", claseAnterior = "" }) {
  const hayPromo = hayPromocion(producto);
  const aPagar = precioAPagar(producto);

  if (!hayPromo) {
    return (
      <span data-precio="efectivo" className={className}>
        {formatPrecio(aPagar)}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span data-precio="efectivo" className={className}>
        {formatPrecio(aPagar)}
      </span>

      {/* El ancla de la oferta: sin el precio anterior, un 15 % menos es solo un
          precio más bajo y no se lee como descuento. El texto para lectores de
          pantalla es obligatorio — el tachado no se anuncia en todos, y sin él
          se escuchan dos montos seguidos sin ninguna pista de qué es cada uno. */}
      <span className={`font-body-sm text-body-sm text-on-surface-variant ${claseAnterior}`}>
        <span className="sr-only">Precio anterior: </span>
        <s>{formatPrecio(producto.precio)}</s>
      </span>

      <span className="font-label-sm text-label-sm rounded-full bg-secondary-container px-2 py-0.5 text-on-secondary-container">
        {producto.descuento.porcentaje}% OFF
      </span>
    </span>
  );
}
