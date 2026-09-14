import { useEffect, useState } from "react";
import { getVitrinasCampania } from "../api/campanias.js";
import { MENSAJE_ERROR_CARGA } from "./useOfertas.js";

/**
 * Una sección de productos por campaña ACTIVA (`GET /campanias/vitrinas`),
 * para la home pública.
 *
 * Contrato de error COMPLETO, mismo criterio que `useMasVendidos` y
 * `useOfertas`: `resuelto` pasa a `true` también cuando falla, para que el
 * loader de carga de la home (`Catalogo.jsx`) no se cuelgue esperando una
 * fuente que nunca va a resolver "bien".
 *
 * Fetch por instancia y no module-level: hay un solo consumidor
 * (`VitrinasCampania`, montado una vez en la home).
 */
export default function useVitrinasCampania() {
  const [vitrinas, setVitrinas] = useState([]);
  const [error, setError] = useState(null);
  const [resuelto, setResuelto] = useState(false);

  useEffect(() => {
    let activo = true;

    getVitrinasCampania()
      .then((data) => {
        if (!activo) return;
        setVitrinas(data ?? []);
        setError(null);
        setResuelto(true);
      })
      .catch(() => {
        if (!activo) return;
        setVitrinas([]);
        setError(MENSAJE_ERROR_CARGA);
        setResuelto(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { vitrinas, error, resuelto };
}
