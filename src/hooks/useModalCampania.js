import { useEffect, useState } from "react";

/**
 * Decide si el cartel de campaña se muestra.
 *
 * LA REGLA: se muestra en CADA carga de página. Antes había un tope de "una vez
 * por día por visitante" apoyado en `localStorage` y en la `claveDia` del
 * backend; se retiró porque el cartel es la vidriera de la campaña y silenciarlo
 * por una visita previa hacía que el visitante recurrente —justamente el que más
 * vuelve— no lo viera nunca.
 *
 * ⚠️ "CADA CARGA" ES CADA CARGA COMPLETA DE PÁGINA, NO CADA NAVEGACIÓN DE LA
 * SPA. Dos piezas lo determinan y ninguna vive acá: `useContextoComercial`
 * cachea el contexto a nivel de módulo (un fetch por carga de página, compartido
 * entre todos los consumidores) y `CampaniaModalMontado` se monta una sola vez,
 * en `Layout`. O sea que después de cerrarlo, el cartel no reaparece navegando
 * dentro del sitio: vuelve recién con un F5.
 *
 * NO PERSISTE NADA. `cerrar` solo apaga el estado local. Volver a escribir en
 * `localStorage` desde acá no daría ningún error ni test rojo de
 * comportamiento visible: simplemente el cartel dejaría de aparecer en la
 * recarga siguiente, en silencio. Por eso el guard de "no toca storage" vive en
 * `useModalCampania.test.jsx`.
 *
 * @param {{campaniaId: number, titulo: string}|null} modal - del contexto comercial
 * @returns {{visible: boolean, cerrar: () => void}}
 */
export default function useModalCampania(modal) {
  const [visible, setVisible] = useState(Boolean(modal));

  // El efecto REABRE al cambiar de campaña: si el visitante cerró un cartel y el
  // contexto trae otro distinto, es otro mensaje y no una repetición. Depender
  // de `modal` (la identidad del objeto que emite el contexto) alcanza: el
  // contexto se resuelve una vez por carga y no re-emite el mismo modal.
  useEffect(() => {
    setVisible(Boolean(modal));
  }, [modal]);

  function cerrar() {
    setVisible(false);
  }

  return { visible, cerrar };
}
