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
  // `resuelto` responde "¿este hook TERMINÓ?", nunca "¿salió bien?" — para lo
  // segundo está `error`, que es un dato aparte y sigue poblándose igual. Lo
  // pide el loader de carga de la home (`pages/Catalogo.jsx`), que se levanta
  // recién cuando sus cuatro fuentes contestaron que sí.
  const [resuelto, setResuelto] = useState(false);

  useEffect(() => {
    let activo = true;

    getProducts({ conDescuento: true, pageSize: OFERTAS_POR_RIEL })
      .then(({ data }) => {
        if (!activo) return;
        setProductos(data ?? []);
        // Un fetch exitoso posterior limpia el error: el contrato lo pide.
        setError(null);
        setResuelto(true);
      })
      .catch(() => {
        if (!activo) return;
        setProductos([]);
        setError(MENSAJE_ERROR_CARGA);
        // ⚠️ `resuelto` PASA A `true` IGUAL, y esto no es opcional: es la misma
        // regla que documenta `useContextoComercial`. Si un fetch fallido
        // dejara `resuelto` en `false`, "todavía no llegó" y "falló y no va a
        // llegar" serían el mismo estado, el loader de la home no se
        // levantaría nunca y el catálogo entero quedaría en blanco. El guard
        // vive en `useOfertas.test.jsx`.
        setResuelto(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { productos, error, resuelto };
}
