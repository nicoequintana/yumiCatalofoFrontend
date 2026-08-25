import { describe, expect, it } from "vitest";
import { rutaProducto, slugify } from "./slug.js";
import { SITIO, urlAbsoluta } from "../constants/seo.js";

/**
 * La misma URL de producto se construye en TRES lugares independientes:
 *   1. `MetaSeo` en la SPA (frontend)
 *   2. el canonical del HTML del crawler (backend, seo.controller.js)
 *   3. la entrada del sitemap (backend, sitemap.controller.js)
 *
 * Los tres usan `rutaProducto`, pero backend y frontend son COPIAS MANUALES.
 * Este test fija la forma exacta de la salida para que una divergencia entre
 * las dos copias falle acá y no en producción, donde el síntoma es solamente
 * que el producto no rankea.
 *
 * La aserción de que `ProductoDetalle` efectivamente EMITE este canonical en
 * el `<head>` vive aparte, en `frontend/src/pages/ProductoDetalle.canonical.test.jsx`:
 * este archivo es `.js` (sin JSX, `vite:oxc` lo rechaza) y solo compone el
 * string; el que verifica la emisión real necesita renderizar el componente.
 */
describe("forma canónica de la URL de producto", () => {
  const casos = [
    [{ id: 1, nombre: "Set de cuchillos" }, "/producto/1-set-de-cuchillos"],
    [{ id: 42, nombre: "Lámpara de diseño" }, "/producto/42-lampara-de-diseno"],
    [{ id: 7, nombre: "Vaso térmico 500ml ¡nuevo!" }, "/producto/7-vaso-termico-500ml-nuevo"],
    [{ id: 9, nombre: "!!!" }, "/producto/9"],
  ];

  it.each(casos)("%o -> %s", (producto, esperado) => {
    expect(rutaProducto(producto)).toBe(esperado);
  });

  it("la URL absoluta no duplica ni omite la barra", () => {
    expect(urlAbsoluta(rutaProducto({ id: 1, nombre: "Test" })))
      .toBe("https://yima-productos.com/producto/1-test");
  });

  it("SITIO.url no termina en barra (si no, urlAbsoluta produce //)", () => {
    expect(SITIO.url.endsWith("/")).toBe(false);
  });

  it("la ruta de categoría usa el mismo slugify", () => {
    expect(`/coleccion/categoria/${slugify("Cocina y hogar")}`).toBe("/coleccion/categoria/cocina-y-hogar");
  });
});
