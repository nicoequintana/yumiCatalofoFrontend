import { useEffect, useState } from "react";
import { getConfiguracionHome } from "../api/config.js";

/**
 * El "producto ícono" de la home (elegido en el admin, T5/T7).
 *
 * `producto` es el detalle público con descuento resuelto, o `null` si nadie
 * lo eligió, dejó de estar publicado o el fetch falló. Falla blando: sin el
 * bloque no se le afirma nada falso al visitante sobre el catálogo.
 *
 * `resuelto` pasa a `true` también cuando falla (loader de la home).
 */
function useProductoIcono() {
  const [producto, setProducto] = useState(null);
  const [resuelto, setResuelto] = useState(false);

  useEffect(() => {
    let activo = true;

    getConfiguracionHome()
      .then((respuesta) => {
        if (activo) setProducto(respuesta?.productoIcono ?? null);
      })
      .catch(() => {
        if (activo) setProducto(null);
      })
      .finally(() => {
        if (activo) setResuelto(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { producto, resuelto };
}

export default useProductoIcono;
