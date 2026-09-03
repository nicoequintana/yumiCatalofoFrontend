/**
 * El precio que el cliente efectivamente paga.
 *
 * Es la ÚNICA definición de "cuánto sale esto" del frontend: la usan
 * `PrecioProducto`, el acumulado del carrito y el del checkout. Que sea una
 * sola importa mucho — si la card mostrara el efectivo y el total sumara el de
 * lista, el cliente vería una oferta y pagaría el precio viejo, **sin ningún
 * error en ningún lado**.
 *
 * **NO calcula el descuento: lo ELIGE.** El número llega resuelto del backend,
 * que es la regla 1 del proyecto aplicada al dato que más plata mueve. Un
 * cálculo de este lado sería el tercer espejo manual entre repos, y el único
 * que puede hacer que la vidriera prometa un precio distinto del que la orden
 * cobra.
 *
 * Vive en su propio archivo y no dentro de `PrecioProducto.jsx` por el mismo
 * motivo que `useToast` vive aparte de `ToastContext`: Fast Refresh solo
 * funciona cuando un archivo exporta únicamente componentes.
 */

/**
 * Los DOS campos tienen que estar. `descuento` sin `precioEfectivo` es una
 * respuesta a medias, y no puede pintar un tachado sobre un precio que no
 * existe ni cobrar un precio que nadie calculó.
 */
export function hayPromocion(producto) {
  return Boolean(producto?.precioEfectivo && producto?.descuento);
}

export function precioAPagar(producto) {
  return hayPromocion(producto) ? producto.precioEfectivo : producto?.precio;
}
