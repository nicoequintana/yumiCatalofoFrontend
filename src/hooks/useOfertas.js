import { useEffect, useState } from "react";
import { getProducts } from "../api/products.js";

/**
 * Los productos con descuento vigente que muestra la home.
 *
 * Fetch por instancia y NO patrón module-level: hay un solo consumidor
 * (`RielOfertas`, montado una vez en la home), así que el cache compartido de
 * `useContextoComercial` sería complejidad sin beneficio.
 *
 * ⚠️ **`error` existe y no es opcional.** Un `catch` que solo vacía la lista
 * hace que un backend caído se lea como "no hay ofertas" — y en la home, eso le
 * dice al visitante que no hay nada rebajado cuando puede haber doce cosas.
 */

/** Cuántas ofertas entran en el riel. Múltiplo de 2, 3 y 4: las columnas reales. */
const OFERTAS_POR_RIEL = 12;

/** El mensaje compartido de "falló la carga", igual en toda la app. */
export const MENSAJE_ERROR_CARGA = "Revisá tu conexión e intentá de nuevo.";

export default function useOfertas() {
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    getProducts({ conDescuento: true, pageSize: OFERTAS_POR_RIEL })
      .then(({ data }) => {
        if (!activo) return;
        setProductos(data ?? []);
        // Un fetch exitoso posterior limpia el error: el contrato lo pide.
        setError(null);
      })
      .catch(() => {
        if (!activo) return;
        setProductos([]);
        setError(MENSAJE_ERROR_CARGA);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos, error };
}
