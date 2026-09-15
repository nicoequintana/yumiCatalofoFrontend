import { useEffect, useState } from "react";
import { getCombos } from "../api/combos.js";
// El mensaje compartido del catálogo público, no una copia más (lo reusan
// `Carrito.jsx` y `Checkout.jsx` desde el mismo módulo).
import { MENSAJE_ERROR_CARGA } from "./useOfertas.js";

/** Los combos vigentes para `/combos` y para la fila de la home. */
export default function useCombosCatalogo() {
  const [combos, setCombos] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    getCombos()
      .then((data) => {
        if (!activo) return;
        setCombos(data ?? []);
        setError(null);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        setCombos([]);
        setError(MENSAJE_ERROR_CARGA);
        setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return { combos, cargando, error };
}
