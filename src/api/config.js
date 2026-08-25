import { fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Public, unauthenticated config for the WhatsApp contact button.
 * @returns {Promise<{numero: string, dentroDeHorario: boolean, textoHorario: string}>}
 */
export async function getWhatsappConfig() {
  const res = await fetchConTimeout(`${BASE}/config/whatsapp`);

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}
