import { getCombos } from "../api/combos.js";
import { crearRecursoDeCarrito } from "./recursoDeCarrito.js";

/**
 * Los combos EN VIVO de las líneas `{comboId}` del carrito, con el mismo cache
 * que `useProductosCarrito` (spec §7.7). A diferencia de un producto borrado,
 * un combo que dejó de estar vigente SIGUE viniendo, con `vigente: false`: es
 * la señal con la que `Carrito.jsx`/`Checkout.jsx` bloquean el pedido.
 *
 * Sin ids no se pide nada: `GET /combos` sin `?ids=` es el catálogo entero.
 *
 * @param {string} claveIds ids de combo del carrito, únicos, ordenados y unidos por coma
 * @returns {{combos: object[], cargando: boolean, error: boolean, revalidando: boolean}}
 */
const recurso = crearRecursoDeCarrito((ids) => (ids.length === 0 ? Promise.resolve([]) : getCombos({ ids })));

export default function useCombosCarrito(claveIds) {
  const { datos, cargando, error, revalidando } = recurso.useRecurso(claveIds);
  return { combos: datos, cargando, error, revalidando };
}

/** Helper de tests, como `reiniciarProductosCarrito`. */
export function reiniciarCombosCarrito() {
  recurso.reiniciar();
}
