import { useEffect, useState } from "react";
import { getResumenCombos } from "../api/combos.js";

/**
 * Los dos números del encabezado de `/combos` (`{cantidad, porcentajeMaximo}`),
 * tal cual los resuelve `GET /combos/resumen`. Falla blando: ante un error el
 * resumen queda en `null`, `error` pasa a `true` y el encabezado sale sin la
 * línea de datos — no es contenido del que dependa la página, y el listado
 * tiene su propio estado de error.
 */
export default function useResumenCombos() {
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    getResumenCombos()
      .then((data) => {
        if (!activo) return;
        setResumen(data ?? null);
        setError(false);
      })
      .catch(() => {
        if (!activo) return;
        setResumen(null);
        setError(true);
      });
    return () => {
      activo = false;
    };
  }, []);

  return { resumen, error };
}
