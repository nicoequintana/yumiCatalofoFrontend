import { describe, expect, it } from "vitest";
import { jsonLdProducto, jsonLdBreadcrumb, jsonLdOrganizacion, jsonLdColeccion } from "./jsonLd.js";

const frontendUrl = "https://yima.example.com";

// A diferencia de la copia del backend (que recibe la fila cruda de Prisma,
// con `precio` como `Decimal`), este mock usa la forma real que entrega
// `mapProducto` del lado del servidor y que consume `ProductoDetalle.jsx`:
// `precio` YA es un string. Es la forma que de verdad le llega a esta copia
// en producción — mockear un `Decimal` acá testearía un caso que nunca pasa.
function productoDePrueba(extra = {}) {
  return {
    id: 12,
    nombre: "Set de cuchillos",
    descripcion: "Seis piezas de acero inoxidable.",
    sku: "YIMA-0012",
    precio: "45000",
    stock: 4,
    categoria: { id: 3, nombre: "Cocina" },
    especificaciones: [{ id: 1, nombre: "Material", valor: "Acero inoxidable" }],
    ...extra,
  };
}

describe("jsonLdProducto", () => {
  it("arma un Product con su Offer", () => {
    const resultado = jsonLdProducto(productoDePrueba(), {
      frontendUrl,
      imagenes: ["https://res.cloudinary.com/demo/a.jpg"],
    });

    expect(resultado["@context"]).toBe("https://schema.org");
    expect(resultado["@type"]).toBe("Product");
    expect(resultado.name).toBe("Set de cuchillos");
    expect(resultado.sku).toBe("YIMA-0012");
    expect(resultado.brand).toEqual({ "@type": "Brand", name: "YIMA" });
    expect(resultado.image).toEqual(["https://res.cloudinary.com/demo/a.jpg"]);
    expect(resultado.category).toBe("Cocina");
  });

  it("emite el precio como string, tal cual sale de .toString(), nunca como número", () => {
    const { offers } = jsonLdProducto(productoDePrueba(), { frontendUrl, imagenes: [] });

    // Un float acá publica "45000.000000001" en el SERP.
    expect(offers.price).toBe("45000");
    expect(typeof offers.price).toBe("string");
    expect(offers.priceCurrency).toBe("ARS");
    expect(offers.itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("un precio entero sale SIN decimales — la cantidad de decimales depende de la escala guardada, no de una regla fija", () => {
    const producto = productoDePrueba({ precio: "45000" });
    const { offers } = jsonLdProducto(producto, { frontendUrl, imagenes: [] });

    expect(offers.price).toBe("45000");
    expect(typeof offers.price).toBe("string");
  });

  it("cae a la imagen de marca cuando el producto no tiene fotos, mismo fallback que og:image", () => {
    const resultado = jsonLdProducto(productoDePrueba(), { frontendUrl, imagenes: [] });
    expect(resultado.image).toEqual(["https://yima.example.com/og-default.png"]);
  });

  it("usa las imágenes reales cuando el producto sí tiene fotos", () => {
    const resultado = jsonLdProducto(productoDePrueba(), {
      frontendUrl,
      imagenes: ["https://res.cloudinary.com/demo/a.jpg"],
    });
    expect(resultado.image).toEqual(["https://res.cloudinary.com/demo/a.jpg"]);
  });

  it("declara InStock cuando hay stock", () => {
    const { offers } = jsonLdProducto(productoDePrueba({ stock: 4 }), { frontendUrl, imagenes: [] });
    expect(offers.availability).toBe("https://schema.org/InStock");
  });

  it("declara OutOfStock cuando el stock es cero o menos", () => {
    for (const stock of [0, -1]) {
      const { offers } = jsonLdProducto(productoDePrueba({ stock }), { frontendUrl, imagenes: [] });
      expect(offers.availability).toBe("https://schema.org/OutOfStock");
    }
  });

  it("apunta la url del Offer a la canónica con slug", () => {
    const { offers } = jsonLdProducto(productoDePrueba(), { frontendUrl, imagenes: [] });
    expect(offers.url).toBe("https://yima.example.com/producto/12-set-de-cuchillos");
  });

  it("mapea las especificaciones a additionalProperty", () => {
    const resultado = jsonLdProducto(productoDePrueba(), { frontendUrl, imagenes: [] });
    expect(resultado.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "Material", value: "Acero inoxidable" },
    ]);
  });

  it("omite category y additionalProperty cuando no hay datos, en vez de emitir null", () => {
    const resultado = jsonLdProducto(
      productoDePrueba({ categoria: null, especificaciones: [] }),
      { frontendUrl, imagenes: [] },
    );
    expect("category" in resultado).toBe(false);
    expect("additionalProperty" in resultado).toBe(false);
  });
});

describe("jsonLdBreadcrumb", () => {
  it("arma Inicio > Colección > Categoría > Producto", () => {
    const resultado = jsonLdBreadcrumb(productoDePrueba(), { frontendUrl });

    expect(resultado["@type"]).toBe("BreadcrumbList");
    expect(resultado.itemListElement).toHaveLength(4);
    expect(resultado.itemListElement[0]).toEqual({
      "@type": "ListItem", position: 1, name: "Inicio", item: "https://yima.example.com/",
    });
    expect(resultado.itemListElement[2].name).toBe("Cocina");
    expect(resultado.itemListElement[2].item).toBe("https://yima.example.com/coleccion/categoria/cocina");
    expect(resultado.itemListElement[3].name).toBe("Set de cuchillos");
  });

  it("omite el nivel de categoría cuando el producto no tiene", () => {
    const resultado = jsonLdBreadcrumb(productoDePrueba({ categoria: null }), { frontendUrl });
    expect(resultado.itemListElement).toHaveLength(3);
    expect(resultado.itemListElement[2].name).toBe("Set de cuchillos");
    expect(resultado.itemListElement[2].position).toBe(3);
  });
});

describe("jsonLdOrganizacion", () => {
  it("arma la Organization de marca", () => {
    const resultado = jsonLdOrganizacion({ frontendUrl });
    expect(resultado["@type"]).toBe("Organization");
    expect(resultado.name).toBe("YIMA");
    expect(resultado.url).toBe("https://yima.example.com/");
    expect(resultado.logo).toBe("https://yima.example.com/og-default.png");
  });
});

describe("jsonLdColeccion", () => {
  it("arma un CollectionPage con su ItemList", () => {
    const resultado = jsonLdColeccion({
      titulo: "Cocina",
      url: "https://yima.example.com/coleccion/categoria/cocina",
      productos: [productoDePrueba(), productoDePrueba({ id: 13, nombre: "Tabla" })],
      frontendUrl,
    });

    expect(resultado["@type"]).toBe("CollectionPage");
    expect(resultado.name).toBe("Cocina");
    expect(resultado.mainEntity["@type"]).toBe("ItemList");
    expect(resultado.mainEntity.numberOfItems).toBe(2);
    expect(resultado.mainEntity.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      url: "https://yima.example.com/producto/12-set-de-cuchillos",
      name: "Set de cuchillos",
    });
  });
});

/**
 * INVARIANTE CRUZADA: el JSON-LD que emite la SPA (esta copia, alimentada
 * por `mapProducto`) tiene que ser byte a byte el mismo que el que emite
 * `seo.controller.js` del lado del servidor (alimentado por la fila cruda de
 * Prisma) para el MISMO producto — si divergen, Google recibe dos
 * descripciones distintas del mismo producto según por dónde entre (bot vs.
 * navegador con JS), que es justo lo que esta feature de SEO existe para
 * evitar.
 *
 * No se puede importar `backend/src/lib/jsonLd.js` desde acá: los dos repos
 * se publican por separado (`git archive HEAD -- .` desde CADA carpeta, ver
 * `docs/deploy/publicar-a-repos-separados.md`) y un import cruzando la
 * carpeta `backend/` andaría en este monorepo de desarrollo pero se rompería
 * en el repo publicado, que ni siquiera tiene esa carpeta. Mismo motivo por
 * el que `canonical.test.js` fija un string literal en vez de importar
 * `backend/src/lib/slug.js`.
 *
 * La prueba real de la equivalencia es esta: se arma el MISMO producto en
 * las dos formas de entrada posibles (la de Prisma, con `precio` como
 * `Decimal`; la de `mapProducto`, con `precio` ya convertido a string) y se
 * verifica que ESTA copia produce el mismo resultado para las dos — que es
 * exactamente la garantía que necesita `.toString()` para no importar de
 * qué lado del contrato HTTP viene el precio. Combinado con que las dos
 * copias son literalmente el mismo código (ver el comentario de cabecera de
 * este archivo), esto cierra el círculo: si el archivo es idéntico Y esta
 * función es indiferente a la forma de entrada, la salida del backend y la
 * de la SPA coinciden.
 */
describe("equivalencia de forma: Prisma (Decimal) vs. mapProducto (string)", () => {
  it("jsonLdProducto da el MISMO resultado con precio-Decimal que con precio-string", () => {
    const formaPrisma = productoDePrueba({ precio: { toString: () => "45000" } });
    const formaMapProducto = productoDePrueba({ precio: "45000" });

    const resultadoPrisma = jsonLdProducto(formaPrisma, {
      frontendUrl,
      imagenes: ["https://res.cloudinary.com/demo/a.jpg"],
    });
    const resultadoMapProducto = jsonLdProducto(formaMapProducto, {
      frontendUrl,
      imagenes: ["https://res.cloudinary.com/demo/a.jpg"],
    });

    expect(resultadoMapProducto).toEqual(resultadoPrisma);
  });

  it("jsonLdBreadcrumb da el MISMO resultado con las dos formas de producto", () => {
    const formaPrisma = productoDePrueba({ precio: { toString: () => "45000" } });
    const formaMapProducto = productoDePrueba({ precio: "45000" });

    expect(jsonLdBreadcrumb(formaMapProducto, { frontendUrl })).toEqual(
      jsonLdBreadcrumb(formaPrisma, { frontendUrl }),
    );
  });
});
