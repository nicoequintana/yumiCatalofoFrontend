import { useEffect, useState } from "react";
import { getProductsByIds } from "../api/products.js";

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
 * @param {string} claveIds ids del carrito, únicos, ordenados y unidos por coma
 * @returns {{productos: object[], cargando: boolean, error: boolean}}
 */
let cache = null; // { clave, ids: Set<number>, productos }
let ultimoPedido = 0;

function idsDeClave(clave) {
  return clave === "" ? [] : clave.split(",").map(Number);
}

function desdeCache(clave) {
  if (!cache) return null;
  if (cache.clave === clave) return cache.productos;
  const ids = idsDeClave(clave);
  if (!ids.every((id) => cache.ids.has(id))) return null;
  const vigentes = new Set(ids);
  return cache.productos.filter((p) => vigentes.has(p.id));
}

export default function useProductosCarrito(claveIds) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let activo = true;
    const pedido = ++ultimoPedido;
    const ids = idsDeClave(claveIds);

    getProductsByIds(ids)
      .then((productos) => {
        // Solo el pedido más reciente escribe el cache: una respuesta vieja que
        // llega tarde no puede pisar precios más nuevos.
        if (pedido === ultimoPedido) {
          cache = { clave: claveIds, ids: new Set(ids), productos };
        }
        if (activo) setResultado({ clave: claveIds, productos, error: false });
      })
      .catch(() => {
        if (activo) setResultado({ clave: claveIds, productos: [], error: true });
      });

    return () => {
      activo = false;
    };
  }, [claveIds]);

  if (resultado && resultado.clave === claveIds) {
    return { productos: resultado.productos, cargando: false, error: resultado.error };
  }

  const cacheados = desdeCache(claveIds);
  if (cacheados) return { productos: cacheados, cargando: false, error: false };
  return { productos: [], cargando: true, error: false };
}

/** Vuelve el módulo a cero. Helper de tests, como `reiniciarConfigContacto`. */
export function reiniciarProductosCarrito() {
  // `ultimoPedido` NO vuelve a 0: un pedido pendiente de un test anterior podría
  // coincidir con el contador reiniciado y sembrar el cache.
  cache = null;
}
