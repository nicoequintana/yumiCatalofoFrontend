import { rutaProducto, rutaCategoria } from "./slug.js";

/**
 * Datos estructurados schema.org del catálogo público.
 *
 * SYNC MANUAL con `backend/src/lib/jsonLd.js`: los dos repos se publican por
 * separado, así que no hay forma de compartir el módulo. Mismo trade-off
 * documentado que `botDetector.js` <-> `nginx.conf` y que `slug.js` en los
 * dos lados. Los dos archivos de test tienen el MISMO set de casos: al tocar
 * una copia, tocar la otra.
 *
 * FUNCIONES PURAS: nada de fetch, nada de estado de React. Las URLs entran
 * por parámetro.
 *
 * Los valores ausentes se OMITEN de la salida en vez de emitirse como `null`:
 * un `"category": null` es un dato inválido para el validador de Google, y
 * una propiedad ausente es simplemente una propiedad ausente.
 *
 * OJO CON LA FORMA DEL `producto`: este módulo lo recibe con la forma que
 * entrega `mapProducto` (backend, `products.mapper.js`) — la que ya viajó
 * por la API — y NO con la forma cruda de Prisma que recibe la copia del
 * backend. La diferencia que importa es `precio`: acá ya es un STRING (lo
 * armó `producto.precio.toString()` del lado del servidor), mientras que la
 * copia del backend recibe un `Decimal` de Prisma. Llamar `.toString()` de
 * nuevo sobre un string es la identidad (`"45000".toString() === "45000"`),
 * así que el mismo código sirve para las dos formas sin ninguna rama
 * condicional — no hay nada que "arreglar" acá, es la razón por la que este
 * archivo es una copia literal y no una reescritura. `categoria`
 * (`{id, nombre}`) y `especificaciones` (`{id, nombre, valor}`) también
 * coinciden en forma con lo que usa esta función: son subconjuntos
 * compatibles del objeto completo de Prisma, y acá solo se les lee
 * `.nombre`/`.valor`. Hay un test de equivalencia (`jsonLd.test.js`) que fija
 * esto con la forma real de `mapProducto`, no con un mock inventado.
 */

const MARCA = "YIMA";
const MONEDA = "ARS";

function absoluta(frontendUrl, ruta) {
  return `${frontendUrl}${ruta}`;
}

export function jsonLdProducto(producto, { frontendUrl, imagenes }) {
  const url = absoluta(frontendUrl, rutaProducto(producto));

  // Google rechaza el rich result de `Product` que no declara `image` — un
  // producto sin fotos no puede emitir un array vacío. Mismo fallback que ya
  // usa `og:image` para el mismo caso (`resolverImagenOg`, `lib/ogMeta.js`).
  const imagenesConFallback = imagenes.length > 0 ? imagenes : [absoluta(frontendUrl, "/og-default.png")];

  const salida = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion ?? "",
    sku: producto.sku,
    brand: { "@type": "Brand", name: MARCA },
    image: imagenesConFallback,
    offers: {
      "@type": "Offer",
      url,
      // `precio` es un STRING acá (`mapProducto` ya lo convirtió) — se emite
      // tal cual entrega su `.toString()`, NUNCA convertido a Number — un
      // float publica un precio con cola de flotante en el resultado de
      // búsqueda. Cuántos decimales lleve depende de la escala del valor
      // guardado (un precio entero sale sin decimales, ej. `"45000"`);
      // schema.org acepta las dos formas.
      price: producto.precio.toString(),
      priceCurrency: MONEDA,
      availability: producto.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (producto.categoria?.nombre) salida.category = producto.categoria.nombre;

  const especificaciones = producto.especificaciones ?? [];
  if (especificaciones.length > 0) {
    salida.additionalProperty = especificaciones.map((e) => ({
      "@type": "PropertyValue",
      name: e.nombre,
      value: e.valor,
    }));
  }

  return salida;
}

export function jsonLdBreadcrumb(producto, { frontendUrl }) {
  const niveles = [
    { name: "Inicio", item: absoluta(frontendUrl, "/") },
    { name: "Colección", item: absoluta(frontendUrl, "/coleccion") },
  ];

  if (producto.categoria?.nombre) {
    // `rutaCategoria` devuelve null cuando el nombre no deja slug (sin id en
    // esa ruta no hay fallback posible) — se omite el nivel en vez de armar
    // un breadcrumb con una URL ambigua.
    const rutaCat = rutaCategoria(producto.categoria);
    if (rutaCat) {
      niveles.push({
        name: producto.categoria.nombre,
        item: absoluta(frontendUrl, rutaCat),
      });
    }
  }

  niveles.push({
    name: producto.nombre,
    item: absoluta(frontendUrl, rutaProducto(producto)),
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: niveles.map((nivel, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: nivel.name,
      item: nivel.item,
    })),
  };
}

export function jsonLdOrganizacion({ frontendUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: MARCA,
    url: absoluta(frontendUrl, "/"),
    // Mismo archivo que usa el Open Graph del sitio y el fallback de un
    // producto sin fotos. Es un PNG y no puede volver a ser un SVG.
    logo: absoluta(frontendUrl, "/og-default.png"),
  };
}

export function jsonLdColeccion({ titulo, url, productos, frontendUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: titulo,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: productos.length,
      itemListElement: productos.map((producto, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluta(frontendUrl, rutaProducto(producto)),
        name: producto.nombre,
      })),
    },
  };
}
