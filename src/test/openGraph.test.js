import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Los meta tags Open Graph del SITIO viven en `index.html` y no en React: un
 * bot de redes sociales no ejecuta JS, así que cualquier tag que pusiera la
 * SPA sería invisible justo para quien tiene que leerlo.
 *
 * Eso los deja fuera del alcance de todos los demás tests, y su modo de falla
 * es silencioso: la app compila, los tests pasan y la preview del link sale
 * rota — algo que solo se ve compartiendo el link en WhatsApp. De ahí estas
 * afirmaciones sobre el archivo estático.
 *
 * Las fichas de producto NO se cubren acá: nginx desvía los bots a
 * `/og/producto/:id`, que arma el backend y tiene sus propios tests.
 */
// Se resuelve contra `process.cwd()` y no contra `import.meta.url`: bajo
// Vitest ese URL no es de esquema `file:`, así que `fileURLToPath` lanza.
const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

function contenidoDe(atributo, nombre) {
  const etiqueta = html.match(new RegExp(`<meta[^>]*${atributo}="${nombre}"[^>]*>`, "s"));
  return etiqueta?.[0].match(/content="([^"]*)"/s)?.[1];
}

describe("Open Graph del catálogo (index.html)", () => {
  it("declara la imagen, el título y la URL que necesita una preview", () => {
    expect(contenidoDe("property", "og:image")).toBeTruthy();
    expect(contenidoDe("property", "og:title")).toBeTruthy();
    expect(contenidoDe("property", "og:url")).toBeTruthy();
    expect(contenidoDe("property", "og:type")).toBe("website");
  });

  it("la imagen es un mapa de bits, nunca un SVG", () => {
    // Los scrapers de WhatsApp, Facebook, Twitter y LinkedIn no renderizan
    // SVG como og:image: la tarjeta sale sin imagen. Es exactamente el error
    // que un cambio bienintencionado puede reintroducir.
    expect(contenidoDe("property", "og:image")).toMatch(/\.(png|jpe?g|webp)$/i);
    expect(contenidoDe("name", "twitter:image")).toMatch(/\.(png|jpe?g|webp)$/i);
  });

  it("la imagen se referencia con URL absoluta", () => {
    // Una ruta relativa deja la preview sin imagen en varios scrapers, que no
    // la resuelven contra el documento.
    expect(contenidoDe("property", "og:image")).toMatch(/^https:\/\//);
  });

  it("declara las medidas de la imagen", () => {
    // Sin ellas el bot tiene que bajar el archivo para maquetar la tarjeta, y
    // algunos directamente no lo hacen.
    expect(contenidoDe("property", "og:image:width")).toBe("1200");
    expect(contenidoDe("property", "og:image:height")).toBe("630");
  });

  it("usa la tarjeta grande de Twitter", () => {
    expect(contenidoDe("name", "twitter:card")).toBe("summary_large_image");
  });

  it("el título y la descripción de OG coinciden con los del documento", () => {
    // Dos textos distintos para la misma página es la clase de desincronización
    // que nadie nota hasta que la ve en un feed.
    expect(contenidoDe("property", "og:title")).toBe(html.match(/<title>(.*?)<\/title>/s)?.[1]);
    expect(contenidoDe("property", "og:description")).toBe(contenidoDe("name", "description"));
  });
});
