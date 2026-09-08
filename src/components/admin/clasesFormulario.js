/**
 * Clases compartidas de los campos de formulario del panel admin.
 *
 * Mismo criterio que `clasesTabla.js` —y ojo, es OTRO archivo: aquel resuelve
 * las tablas—: no hay un componente `<CampoAdmin>` porque cada campo difiere en
 * el elemento que envuelve (`input`, `select`, `textarea`), en su ayuda y en su
 * validación. Lo que sí se comparte son estos dos strings, que estaban
 * duplicados LITERAL en el formulario de campaña y en `DialogoProgramar`.
 *
 * Todo el color sale de tokens semánticos: un hex acá rompería el modo oscuro
 * del panel, que se resuelve a nivel de custom properties.
 */
export const claseEtiqueta =
  "font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface";

/**
 * El anillo de foco son CUATRO utilidades y ninguna sobra:
 *
 * - `focus-visible:outline` fija `outline-style: solid`. Sin ella el estilo
 *   queda en el `auto` del navegador, y `auto` IGNORA el ancho y el color
 *   declarados: el anillo se vería igual que el del sistema.
 * - `outline-2` es el grosor que pide WCAG 2.2 SC 2.4.11. Antes acá había un
 *   `focus:outline-none`, que no "saca" el outline sino que lo pinta
 *   TRANSPARENTE (medido: `outline: solid 2px rgba(0,0,0,0)`), así que el
 *   único cambio real al enfocar era el borde de 1px — contraste suficiente,
 *   grosor insuficiente.
 * - `outline-offset-2` lo separa del borde redondeado, que si no se come el
 *   anillo en las esquinas.
 * - `outline-primary` mantiene el color en un token: un hex acá rompería el
 *   modo oscuro del panel, que se resuelve a nivel de custom properties.
 *
 * Va en `focus-visible` y no en `focus` para que el anillo aparezca cuando se
 * llega por teclado y no en cada click de mouse.
 */
export const claseCampo =
  "w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
