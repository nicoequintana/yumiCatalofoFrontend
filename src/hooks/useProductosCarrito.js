import { getProductsByIds } from "../api/products.js";
import { crearRecursoDeCarrito } from "./recursoDeCarrito.js";

// Lambda y no la referencia directa: los tests reemplazan el export con
// `vi.mock("../api/products.js")` y la llamada tiene que ver ese reemplazo.
const recurso = crearRecursoDeCarrito((ids) => getProductsByIds(ids));

/**
 * Los productos EN VIVO de las líneas del carrito, compartido por `Carrito.jsx`
 * y `Checkout.jsx` (hacían el mismo `getProductsByIds` cada uno por su lado).
 *
 * STALE-WHILE-REVALIDATE con cache a nivel de módulo. Sin él, cada montaje
 * arrancaba con `productos = []` y `cargando = true`: volver al carrito o tocar
 * "Continuar" pintaba "Cargando carrito…"/"Cargando checkout…" durante 30-110 ms,
 * el `main` se achicaba y el pie saltaba adentro de la pantalla (ghosting medido
 * cuadro a cuadro el 14/09/2026).
 *
 * - Al montar se muestra lo último cargado para esos ids y **SIEMPRE** se vuelve
 *   a pedir en segundo plano: precio, stock y disponibilidad los decide la
 *   respuesta viva, que reemplaza al cache apenas llega. El cache solo evita el
 *   cuadro vacío; nunca es la fuente de la plata.
 * - `cargando` es `true` solo cuando no hay nada cacheado que sirva para esos ids.
 * - Ids que cambiaron: si el set nuevo está CONTENIDO en el cacheado (se quitó
 *   una línea) se muestra el cache filtrado — lo quitado no queda colgado. Si hay
 *   un id que el cache nunca pidió, se vuelve a `cargando`: dibujar las líneas
 *   cacheadas y la nueva sin producto la mostraría como "no disponible", que es
 *   un dato falso. Un id que el cache SÍ pidió y el backend no devolvió (oculto,
 *   agotado, borrado) sigue ausente, igual que en la respuesta viva.
 * - Si el fetch falla gana el error aunque haya cache: la pantalla distingue
 *   "falló la carga" de "no hay nada", y un checkout no se apoya en precios que
 *   no pudo verificar.
 *
 * - `revalidando` es `true` mientras lo que se ve sale del cache y el fetch vivo
 *   de ESTOS ids todavía no contestó. El cache vive toda la sesión SPA, así que
 *   una pantalla que CONFIRMA plata (`Checkout.jsx`) no deja confirmar hasta que
 *   baje a `false`; el carrito solo navega y puede ignorarlo.
 *
 * @param {string} claveIds ids del carrito, únicos, ordenados y unidos por coma
 * @returns {{productos: object[], cargando: boolean, error: boolean, revalidando: boolean}}
 */
export default function useProductosCarrito(claveIds) {
  const { datos, cargando, error, revalidando } = recurso.useRecurso(claveIds);
  return { productos: datos, cargando, error, revalidando };
}

/** Vuelve el módulo a cero. Helper de tests, como `reiniciarConfigContacto`. */
export function reiniciarProductosCarrito() {
  recurso.reiniciar();
}
