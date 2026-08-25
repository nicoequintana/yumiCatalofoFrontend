/**
 * Borra del `<head>` los tags estáticos de `frontend/index.html` que
 * `MetaSeo.jsx` reemplaza por ruta.
 *
 * React 19 hoistea `<title>`, `<meta>` y `<link>` al `<head>` desde
 * cualquier componente, pero solo deduplica `<link>` de stylesheets — los
 * `<meta>` los AGREGA, nunca reemplaza un tag existente.
 *
 * `index.html` trae doce tags (`description` + los OG/Twitter, incluido
 * `og:site_name`) como fallback para un cliente que NO ejecuta JS: un bot
 * que `botDetector.js` no reconoce, y que nginx por lo tanto no desvía al
 * HTML server-side de `/og/producto/:id`, solo ve esos. Sin esta limpieza,
 * en cualquier ruta con JS corriendo quedan DOS `og:title` (el genérico de
 * la home y el de esta ficha) en el `<head>` — y
 * `document.head.querySelector` devuelve el primero, o sea SIEMPRE el
 * genérico, sin importar en qué producto esté parado el visitante. Medido
 * con Playwright en una ficha real.
 *
 * Los dos juegos son fallback de escenarios distintos y ninguno se puede
 * borrar sin más: por eso la solución no es "sacar los de `index.html`",
 * es marcarlos (`data-seo-estatico`) y borrarlos recién cuando se confirma
 * que hay JS corriendo — que es exactamente lo que el montaje de un
 * `MetaSeo` confirma.
 *
 * Corre una sola vez en toda la vida de la página (flag a nivel de módulo,
 * mismo patrón que `useCarrito.js` / `useFavoritos.js` / `useTemaAdmin.js`)
 * porque los tags estáticos solo existen una vez en el documento — repetir
 * el barrido en cada montaje de `MetaSeo` sería trabajo de más sin ningún
 * nodo nuevo que limpiar.
 */
let limpiezaHecha = false;

export function limpiarMetaEstaticos() {
  if (limpiezaHecha || typeof document === "undefined") return;
  limpiezaHecha = true;
  document.head.querySelectorAll("[data-seo-estatico]").forEach((nodo) => nodo.remove());
}

/**
 * Solo para tests: `limpiezaHecha` vive a nivel de módulo, así que sin esto
 * el primer test que llama a `limpiarMetaEstaticos` (directo o vía montar
 * `MetaSeo`) consume la limpieza y los siguientes la ven como no-op.
 * Explícito y a la vista en vez de un reset automático escondido en
 * `setup.js` — un reset global ahí afectaría a toda la suite por un
 * mecanismo que solo le importa a este módulo y a `MetaSeo`.
 */
export function _reiniciarLimpiezaEstaticaParaTests() {
  limpiezaHecha = false;
}
