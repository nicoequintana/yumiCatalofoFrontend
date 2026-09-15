/**
 * Cuentas del lienzo de la vista previa (`LienzoTienda.jsx`), puras para poder
 * probarlas: jsdom mide todo en 0.
 */

/** Cuánto achicar la tienda (ancho real) para que entre en `disponible`. Nunca agranda. */
export function escalaParaAncho(disponible, anchoReal) {
  if (!(disponible > 0) || !(anchoReal > 0)) return 1;
  return Math.min(1, disponible / anchoReal);
}

/**
 * Alto del marco en el panel y alto del iframe (px de la tienda).
 * - Sin `altoMaximo`: el iframe mide lo que el contenido; nada scrollea.
 * - Con `altoMaximo` (px del panel): el marco se corta ahí y el iframe pasa a
 *   ser un VIEWPORT de `altoMaximo / escala` px que scrollea adentro — así la
 *   barra `sticky` de la página queda pegada abajo, como en un celular.
 */
export function medidasDelMarco({ altoContenido, escala, altoMaximo }) {
  const altoEscalado = Math.ceil(altoContenido * escala);
  if (!altoMaximo || altoEscalado <= altoMaximo) {
    return { altoMarco: altoEscalado, altoIframe: altoContenido };
  }
  return { altoMarco: altoMaximo, altoIframe: Math.round(altoMaximo / escala) };
}
