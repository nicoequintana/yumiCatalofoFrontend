import useWhatsapp from "../hooks/useWhatsapp.js";
import { AREA_TACTIL_ANCHA } from "../utils/areaTactil.js";

const TEXTO_POR_DEFECTO = "¿Necesitás ayuda? Escribinos por WhatsApp";

/**
 * "El principio de la puerta" (spec): toda pantalla de bloqueo —429, "link
 * ya usado", "no te llegó el mail", "código incorrecto", el tercer intento
 * fallido de login, "no pudimos verificar tu sesión"— ofrece este mismo
 * canal. Reusa `useWhatsapp` (el mismo del FAB público): no hay un segundo
 * número que mantener sincronizado.
 *
 * Sin número configurado (`GET /api/config/whatsapp` sin `numero`, o la
 * request falló) no renderiza nada — mismo criterio de falla blanda que
 * `BotonWhatsapp`.
 *
 * Es un link de texto en flujo (no un botón suelto): el área táctil se
 * extiende con el pseudo-elemento compartido (`AREA_TACTIL_ANCHA`), no con
 * `min-h-11`, para no agrandar el bloque visible — mismo criterio que la
 * variante `inline` de `BotonWhatsapp`.
 */
function PuertaWhatsApp({ texto = TEXTO_POR_DEFECTO, contexto }) {
  const { url } = useWhatsapp(contexto ?? { tipo: "home" });

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-body-md text-body-md text-primary underline ${AREA_TACTIL_ANCHA}`}
    >
      {texto}
    </a>
  );
}

export default PuertaWhatsApp;
