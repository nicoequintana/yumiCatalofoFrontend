const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Public, unauthenticated config for the WhatsApp contact button.
 * @returns {Promise<{numero: string, dentroDeHorario: boolean, textoHorario: string}>}
 */
export async function getWhatsappConfig() {
  const res = await fetch(`${BASE}/config/whatsapp`);

  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}
