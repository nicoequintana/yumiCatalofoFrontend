import { useEffect, useState } from "react";
import { getResumenCombos } from "../api/combos.js";

/**
 * Los dos números del encabezado de `/combos` (`{cantidad, porcentajeMaximo}`),
 * tal cual los resuelve `GET /combos/resumen`. Falla blando: ante un error el
 * resumen queda en `null` y el encabezado sale sin la línea de datos — no es
 * contenido del que dependa la página, y el listado tiene su propio estado de error.
 */
export default function useResumenCombos() {
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    let activo = true;
    getResumenCombos()
      .then((data) => {
        if (activo) setResumen(data ?? null);
      })
      .catch(() => {
        if (activo) setResumen(null);
      });
    return () => {
      activo = false;
    };
  }, []);

  return { resumen };
}
