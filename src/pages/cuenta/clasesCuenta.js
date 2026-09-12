/**
 * Clases compartidas de las CUATRO pantallas de cuenta de cliente (`Entrar`,
 * `MiCuenta`, `Seguridad`, `Datos`).
 *
 * Mismo criterio que `components/admin/clasesFormulario.js` —y es otro archivo,
 * aquel resuelve el panel—: no hay un componente `<CampoCuenta>` porque cada
 * campo difiere en el elemento que envuelve (`input` propio, `CampoPassword`),
 * en su ícono y en su ayuda. Lo que sí se comparte son estos strings.
 *
 * Vive acá y no en `components/` porque sus consumidores son exactamente estas
 * cuatro pantallas: colocado al lado de quien lo usa, y con `clasesCuenta.test.js`
 * al lado también.
 *
 * **El motivo por el que existe.** El bloque del campo llegó a estar CUATRO
 * veces y el del botón TRES, repartidos entre tres archivos: la constante se
 * extrajo una vez POR ARCHIVO en vez de una sola vez compartida, y dos de las
 * copias eran byte-idénticas entre archivos distintos. Ya habían empezado a
 * divergir. Duplicarlas de nuevo es una regresión, y hay un test que lo mira.
 *
 * Todo el color sale de tokens semánticos en canales: un hex acá no emitiría
 * nada con opacidad y rompería el tema en silencio.
 */

/**
 * Lo que TODOS los campos comparten: caja, fondo, tipografía, foco.
 *
 * Deliberadamente SIN ancho ni padding horizontal: son justo las dos cosas que
 * cambian según quién dibuje el campo. Las tres constantes de abajo los ponen.
 *
 * El anillo de foco es el teal de marca, no el primario: en estas pantallas el
 * terracota es del CTA, y usarlo también para el foco borraría la diferencia
 * entre "estás acá" y "esto es lo que hay que apretar".
 */
const CAMPO_COMUN =
  "rounded-2xl border border-outline-variant bg-surface-container-lowest py-3.5 font-body-md text-body-md text-on-surface focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40";

/**
 * Campo con un ícono dibujado adentro, a la izquierda: `pl-11` es el hueco que
 * ese ícono ocupa. Para un `<input>` propio, que necesita su `w-full`.
 */
export const claseCampoConIcono = `w-full ${CAMPO_COMUN} pl-11 pr-4`;

/**
 * Campo SIN ícono (los de `Datos`). `px-4` en vez de `pl-11` **no es un
 * descuido**: sin ícono, `pl-11` dejaría el texto arrancando contra un hueco
 * vacío de 44px. Es una diferencia querida y hay un test que la fija.
 */
export const claseCampoSinIcono = `w-full ${CAMPO_COMUN} px-4`;

/**
 * La variante para `CampoPassword`, que **reemplaza** la apariencia con lo que
 * le pasemos pero agrega `w-full pr-12` por su cuenta (`pr-12` es el hueco del
 * ojito, y pisarlo lo superpone al texto). Por eso acá no van ni el ancho ni
 * ningún `pr-*`.
 */
export const claseCampoPassword = `${CAMPO_COMUN} pl-11`;

/**
 * Etiqueta de campo. Sin margen ni `block`: la pensada es que el contenedor sea
 * un `flex flex-col gap-1.5`, que es lo que ya hacen los `<div>` de `Entrar` y
 * `Datos`.
 */
export const claseEtiqueta =
  "font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant";

/**
 * La misma etiqueta para `CampoPassword`, que NO envuelve en un flex y necesita
 * el `block` y la separación explícitos.
 */
export const claseEtiquetaSuelta = `${claseEtiqueta} mb-1.5 block`;

/**
 * El CTA de estas pantallas. Terracota (`bg-primary`), nunca el teal: el teal
 * es de foco, avatar y banner.
 */
export const claseBotonPrimario =
  "font-label-lg text-label-lg min-h-11 rounded-2xl bg-primary px-4 py-3.5 text-on-primary disabled:opacity-50";

const PAGINA_COMUN = "mx-auto flex max-w-sm flex-col px-margin-mobile py-16 md:px-margin-desktop";

/** Contenedor de las pantallas con formulario. */
export const clasePagina = `${PAGINA_COMUN} gap-6`;

/**
 * Contenedor de `MiCuenta`. `gap-4` y no `gap-6` a propósito: son tarjetas
 * pegadas una debajo de la otra, no campos de un formulario — con el gap de
 * los formularios la lista se desarma en bloques sueltos.
 */
export const clasePaginaDensa = `${PAGINA_COMUN} gap-4`;
