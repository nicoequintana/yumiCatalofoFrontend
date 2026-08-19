/**
 * Cliente del import masivo de productos. Ambas llamadas usan
 * `fetchAutenticado`, que devuelve el `Response` crudo (no JSON parseado) —
 * por eso sirve tal cual para bajar un binario.
 */

import { fetchAutenticado } from "./authClient.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Descarga la plantilla `.xlsx` y dispara el "guardar como" del browser.
 *
 * El archivo se pide con el header de auth, así que no se puede usar un `<a
 * href>` directo: hay que traerlo como blob y crear un object URL temporal.
 */
export async function descargarPlantilla() {
  const res = await fetchAutenticado(`${BASE}/products/import/template`);

  if (!res.ok) {
    throw new Error("No se pudo descargar la plantilla.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "plantilla-productos.xlsx";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/**
 * Sube el archivo completado.
 *
 * No se setea `Content-Type` a mano: el browser tiene que generar el boundary
 * del multipart. Mismo criterio que `products.js` con las fotos.
 *
 * Un 400 con lista de errores de fila se distingue de un fallo genérico: se
 * lanza un `Error` con la propiedad `errores` para que la pantalla pueda
 * renderizar la tabla en vez de un mensaje suelto.
 */
export async function importarProductos(file) {
  const fd = new FormData();
  fd.append("archivo", file);

  const res = await fetchAutenticado(`${BASE}/products/import`, { method: "POST", body: fd });

  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    const error = new Error(body?.error ?? "No se pudo importar el archivo.");
    if (Array.isArray(body?.errores)) error.errores = body.errores;
    throw error;
  }

  return body;
}
