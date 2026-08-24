import { SITIO } from "../constants/seo.js";

/**
 * Meta tags de SEO por ruta. Presentacional puro: recibe props, no hace fetch.
 *
 * React 19 HOISTEA `<title>`, `<meta>` y `<link>` al `<head>` desde cualquier
 * componente del árbol. Por eso no hace falta `react-helmet` ni ninguna
 * dependencia: se renderizan como cualquier otro elemento y React los sube
 * solo (y los retira al desmontar el componente).
 *
 * OJO: esto NO reemplaza al HTML server-side de `/og/*`. Un crawler que no
 * ejecuta JS (o lo ejecuta tarde) nunca ve estos tags. Los dos caminos
 * coexisten y DEBEN declarar el mismo canonical.
 */

/**
 * Serializa un objeto para meterlo dentro de un `<script type="application/ld+json">`.
 *
 * El `<` se reemplaza por su escape unicode `<`. Sin eso, un producto
 * llamado `Cuchillo </script><script>alert(1)</script>` cierra la etiqueta
 * antes de tiempo y el resto se ejecuta como script: es una inyección real,
 * no un detalle de estilo. `<` es JSON válido y `JSON.parse` lo resuelve
 * al mismo carácter, así que el dato que lee Google no cambia.
 *
 * Espeja `serializarJsonLd` de `backend/src/lib/htmlSeo.js` — misma
 * implementación, mismo razonamiento. Sync manual entre repos, como
 * `slug.js`.
 */
function serializarJsonLd(objeto) {
  return JSON.stringify(objeto).replaceAll("<", "\\u003c");
}

function MetaSeo({
  titulo,
  descripcion,
  canonical,
  imagen = SITIO.imagenPorDefecto,
  tipoOg = "website",
  noindex = false,
  jsonLd = null,
}) {
  const bloques = jsonLd === null ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return (
    <>
      <title>{titulo}</title>
      <meta name="description" content={descripcion} />
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}

      <meta property="og:type" content={tipoOg} />
      <meta property="og:site_name" content={SITIO.nombre} />
      <meta property="og:locale" content="es_AR" />
      <meta property="og:title" content={titulo} />
      <meta property="og:description" content={descripcion} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imagen} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={titulo} />
      <meta name="twitter:description" content={descripcion} />
      <meta name="twitter:image" content={imagen} />

      {bloques.map((bloque, i) => (
        <script
          // El índice alcanza como key: el orden de los bloques es estable y
          // no se reordenan ni se filtran.
          key={i}
          type="application/ld+json"
          // React escapa el contenido de un <script> de un modo que rompe el
          // parseo del bloque JSON-LD. No hay alternativa a esto.
          dangerouslySetInnerHTML={{ __html: serializarJsonLd(bloque) }}
        />
      ))}
    </>
  );
}

export default MetaSeo;
