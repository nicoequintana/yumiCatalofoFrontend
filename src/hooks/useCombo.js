import { useEffect, useState } from "react";
import { getCombo } from "../api/combos.js";
import { MENSAJE_ERROR_CARGA } from "./useOfertas.js";

/**
 * El detalle de un combo. Distingue "no existe / no vigente" (`getCombo`
 * devuelve `null` ante el 404, igual que `getProductById`) de "falló la carga".
 * Con `idSlug` nulo no pide nada: es el caso de la vista previa del editor,
 * que le pasa el combo armado a `PaginaCombo` por `comboForzado`.
 */
export default function useCombo(idSlug) {
  const [estado, setEstado] = useState({ combo: null, cargando: Boolean(idSlug), error: null, noEncontrado: false });

  useEffect(() => {
    if (!idSlug) return undefined;
    let activo = true;
    setEstado({ combo: null, cargando: true, error: null, noEncontrado: false });
    getCombo(idSlug)
      .then((combo) => {
        if (!activo) return;
        setEstado({ combo, cargando: false, error: null, noEncontrado: combo === null });
      })
      .catch(() => {
        if (activo) setEstado({ combo: null, cargando: false, error: MENSAJE_ERROR_CARGA, noEncontrado: false });
      });
    return () => {
      activo = false;
    };
  }, [idSlug]);

  return estado;
}
