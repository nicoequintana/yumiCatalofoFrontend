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

export const claseCampo =
  "w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none";
