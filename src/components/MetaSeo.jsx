import { useEffect } from "react";
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
 *
 * **Por qué el efecto de limpieza de acá abajo existe.** El hoisteo de React
 * 19 solo deduplica `<link>` de stylesheets — los `<meta>` los AGREGA,
 * nunca reemplaza un tag existente. `frontend/index.html` ya trae doce tags
 * (`description` + los OG/Twitter, incluido `og:site_name`) como fallback
 * para un cliente que NO ejecuta JS: un bot que `botDetector.js` no
 * reconoce, y que nginx por lo tanto no desvía al HTML server-side de
 * `/og/producto/:id`, solo ve esos.
 * Sin limpieza, en cualquier ruta con JS corriendo quedan DOS `og:title` (el
 * genérico de la home y el de esta ficha) en el `<head>` — y
 * `document.head.querySelector` devuelve el primero, o sea SIEMPRE el
 * genérico, sin importar en qué producto esté parado el visitante. Medido
 * con Playwright en una ficha real. Este efecto borra del `<head>` los tags
 * estáticos marcados con `data-seo-estatico` la primera vez que cualquier
 * `MetaSeo` monta en la vida de la página, para que sobreviva un único juego:
 * el genérico mientras no corrió JS, el de esta ruta apenas corre. Corre una
 * sola vez (flag a nivel de módulo, mismo patrón que `useCarrito.js` /
 * `useFavoritos.js` / `useTemaAdmin.js`) porque los tags estáticos solo
 * existen una vez en el documento — repetir el barrido en cada montaje de
 * `MetaSeo` sería trabajo de más sin ningún nodo nuevo que limpiar.
 */
let limpiezaEstaticaHecha = false;

/**
 * Solo para tests: `limpiezaEstaticaHecha` vive a nivel de módulo, así que
 * sin esto el primer test que monta `MetaSeo` en un archivo consume el
 * efecto y los siguientes lo ven como no-op. Explícito y a la vista en vez
 * de un reset automático escondido en `setup.js` — un reset global ahí
 * afectaría a toda la suite por un efecto que solo le importa a este
 * componente.
 */
export function _reiniciarLimpiezaEstaticaParaTests() {
  limpiezaEstaticaHecha = false;
}

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

  // No toca lo que este componente renderiza — solo remueve nodos que otro
  // documento (`index.html`) ya puso en el `<head>` antes de que React
  // montara. Sin `document` en el cuerpo del componente: un efecto ya es
  // seguro en SSR (no corre en el servidor), pero además así el chequeo
  // vale incluso si algún día esto se renderiza en un entorno sin `window`.
  useEffect(() => {
    if (limpiezaEstaticaHecha || typeof document === "undefined") return;
    limpiezaEstaticaHecha = true;
    document.head.querySelectorAll("[data-seo-estatico]").forEach((nodo) => nodo.remove());
  }, []);

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
