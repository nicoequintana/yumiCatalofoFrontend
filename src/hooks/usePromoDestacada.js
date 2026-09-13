import { useEffect, useState } from "react";
import { getPromocionDestacada } from "../api/promociones.js";

/**
 * La promoción que el admin marcó "destacada en home", si está vigente.
 *
 * `promo` es `null` sin destacada Y ante un fetch fallido: en los dos casos
 * `PromosActivas` cae al listado de ofertas de siempre, que tiene su propio
 * contrato de error (`useOfertas`). Un fallo acá no le afirma nada falso al
 * visitante — la sección sigue mostrando lo rebajado.
 *
 * `resuelto` responde "¿terminó?", nunca "¿salió bien?": pasa a `true` también
 * cuando falla, o el loader de la home no se levantaría nunca.
 *
 * Fetch por instancia, como `useOfertas`: un solo consumidor (`Catalogo.jsx`).
 */
function usePromoDestacada() {
  const [promo, setPromo] = useState(null);
  const [resuelto, setResuelto] = useState(false);

  useEffect(() => {
    let activo = true;

    getPromocionDestacada()
      .then((respuesta) => {
        if (activo) setPromo(respuesta ?? null);
      })
      .catch(() => {
        if (activo) setPromo(null);
      })
      .finally(() => {
        if (activo) setResuelto(true);
      });

    return () => {
      activo = false;
    };
  }, []);

  return { promo, resuelto };
}

export default usePromoDestacada;
