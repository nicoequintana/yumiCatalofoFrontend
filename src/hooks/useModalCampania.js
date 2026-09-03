import { useEffect, useState } from "react";

/**
 * Decide si el modal de campaña se muestra, y registra que se mostró.
 *
 * LA REGLA: máximo una vez por día por visitante. Un cartel que reaparece en
 * cada navegación deja de ser una novedad y pasa a ser un obstáculo.
 *
 * **El día lo decide el BACKEND** (`claveDia` del contexto comercial), no el
 * reloj del navegador. Es la misma disciplina que el resto del módulo: el
 * sistema tiene una sola definición de "día". Con el reloj local, alguien con la
 * máquina mal puesta vería el cartel dos veces, o dejaría de verlo.
 *
 * Mientras no exista autenticación de clientes, "por visitante" es "por
 * navegador": `localStorage`, que es lo que el proyecto ya usa para carrito,
 * favoritos y tema. El día que haya cuentas, esto se muda al perfil sin tocar
 * nada de lo que lo consume — el hook devuelve lo mismo.
 */

export const CLAVE_STORAGE = "yumi-modal-campania";

/**
 * Qué modal se vio y qué día.
 *
 * Las tres lecturas y escrituras van en `try/catch`: el modo privado y algunas
 * políticas de navegador hacen que `localStorage` LANCE, no que devuelva null.
 * Esto es decoración — que no se pueda registrar no puede tumbar el catálogo.
 */
function leerRegistro() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return null;
    const registro = JSON.parse(crudo);
    // Un registro corrupto (o de una versión vieja del formato) se trata como
    // "nunca se vio": mostrar de más es mejor que romper.
    return typeof registro?.clave === "string" ? registro : null;
  } catch {
    return null;
  }
}

function guardarRegistro(campaniaId, clave) {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify({ campaniaId, clave }));
  } catch {
    // Sin registro, el modal reaparece en la próxima carga. Es el peor caso
    // aceptable, y solo lo sufre quien tiene el storage bloqueado.
  }
}

/**
 * @param {{campaniaId: number, titulo: string}|null} modal - del contexto comercial
 * @param {string|null} claveDia - `"YYYY-MM-DD"` que manda el backend
 * @returns {{visible: boolean, cerrar: () => void}}
 */
export default function useModalCampania(modal, claveDia) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Sin modal no hay nada que mostrar. Sin `claveDia` —el contexto todavía no
    // llegó, o falló— no hay forma de saber si ya se mostró hoy, y mostrarlo
    // igual significaría repetirlo en cada recarga.
    if (!modal || !claveDia) {
      setVisible(false);
      return;
    }

    const registro = leerRegistro();
    // Una campaña DISTINTA se muestra aunque ya se haya visto otra hoy: es otro
    // mensaje, no una repetición. Silenciarlo por el registro de una campaña
    // ajena haría que estrenar una campaña el mismo día que terminó otra pasara
    // desapercibido.
    const yaSeVio = registro?.clave === claveDia && registro?.campaniaId === modal.campaniaId;

    setVisible(!yaSeVio);
  }, [modal, claveDia]);

  function cerrar() {
    setVisible(false);
    if (modal && claveDia) guardarRegistro(modal.campaniaId, claveDia);
  }

  return { visible, cerrar };
}
