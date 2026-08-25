/**
 * Identidad del sitio para SEO y Open Graph.
 *
 * La URL es absoluta y está escrita a mano, igual que en `index.html`: Vite no
 * interpola variables de entorno dentro del HTML sin un plugin aparte, y los
 * canonical TIENEN que ser absolutos. Un cambio de dominio se toca en los dos
 * lugares.
 *
 * `url` va SIN barra final a propósito: el backend normaliza `FRONTEND_URL`
 * de la misma forma (`backend/src/lib/urlsPublicas.js`) justamente para que
 * su canonical coincida con este. Agregarle una barra acá produce
 * `https://yima-productos.com//producto/…` y divergiría del canonical que
 * emite el crawler — la falla silenciosa que esta feature existe para evitar.
 */
export const SITIO = {
  nombre: "YIMA",
  url: "https://yima-productos.com",
  // PNG, nunca SVG: los scrapers de WhatsApp, Facebook, Twitter y LinkedIn no
  // renderizan SVG como og:image y la tarjeta sale vacía.
  imagenPorDefecto: "https://yima-productos.com/og-default.png",
};

export function urlAbsoluta(ruta) {
  return `${SITIO.url}${ruta}`;
}
