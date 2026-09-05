import { useEffect, useState } from "react";

/**
 * Decide si el cartel de campaña se muestra.
 *
 * LA REGLA: **una vez por día por visitante**.
 *
 * ⚠️ Esto REVIERTE la regla de "cada carga" del 04/09, y el motivo por el que
 * se puede: cuando ese tope se retiró, el cartel era la ÚNICA puerta a la
 * campaña, así que silenciarlo dejaba al visitante recurrente sin enterarse de
 * nada. Con el carrusel siempre presente en la home eso dejó de ser cierto: la
 * campaña sigue estando en cada visita, y lo único que el visitante deja de
 * recibir es el portazo en cada recarga.
 *
 * LA CLAVE ES CAMPAÑA + DÍA, no solo el día. Sin eso se perdería la conducta de
 * que el cartel REABRE al cambiar de campaña: si el visitante cerró uno y
 * después empieza otra, es otro mensaje y no una repetición.
 *
 * EL DÍA LO MANDA EL BACKEND (`claveDia`, día argentino). Calcularlo con el
 * reloj del navegador haría que alguien en otra zona horaria lo viera dos
 * veces, o ninguna.
 *
 * DEGRADA A MOSTRARLO. Sin `claveDia` —porque `activas` falló— o con el storage
 * bloqueado, el cartel se muestra y no se persiste nada: de más antes que de
 * menos.
 *
 * @param {{campaniaId: number, titulo: string}|null} modal
 * @param {string|null} claveDia - "AAAA-MM-DD" argentino, del backend
 * @returns {{visible: boolean, cerrar: () => void}}
 */

const PREFIJO = "yima:cartel:";

function claveDe(modal, claveDia) {
  if (!modal || !claveDia) return null;
  return `${PREFIJO}${modal.campaniaId}:${claveDia}`;
}

/** Storage puede tirar (incógnito, cookies bloqueadas): nunca rompe la home. */
function yaLoVio(clave) {
  if (!clave) return false;
  try {
    return localStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
}

function marcarVisto(clave) {
  if (!clave) return;
  try {
    localStorage.setItem(clave, "1");
  } catch {
    // Sin storage el cartel vuelve en la próxima carga. Es el modo de falla
    // benigno: molesta, no rompe.
  }
}

export default function useModalCampania(modal, claveDia) {
  const [visible, setVisible] = useState(false);

  // REABRE al cambiar de campaña o de día. Depender de los dos es lo que hace
  // que la clave compuesta signifique algo.
  useEffect(() => {
    const clave = claveDe(modal, claveDia);
    setVisible(Boolean(modal) && !yaLoVio(clave));
  }, [modal, claveDia]);

  function cerrar() {
    marcarVisto(claveDe(modal, claveDia));
    setVisible(false);
  }

  return { visible, cerrar };
}
