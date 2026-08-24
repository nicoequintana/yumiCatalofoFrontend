/**
 * Wordmark de la marca. Reemplaza al texto "YIMA" en el encabezado público y
 * en el panel admin; el pie de página conserva el texto a propósito.
 *
 * Tres cosas que parecen detalle y no lo son:
 *
 * - `alt="YIMA"` es el contrato accesible del logo. Los enlaces que lo
 *   envuelven toman de acá su nombre accesible, así que vaciarlo dejaría al
 *   link a la home sin nombre (y rompería los tests que lo buscan por él).
 * - `width`/`height` son las dimensiones INTRÍNSECAS del archivo, no el tamaño
 *   en pantalla —ese lo fija `className` con la altura—. Sin ellas el navegador
 *   no puede reservar el espacio y el encabezado salta al terminar la carga.
 * - `loading="eager"`: vive en el encabezado sticky, siempre sobre el pliegue.
 *   Diferirlo solo agregaría un salto visible.
 *
 * El archivo se sirve en dos formatos: WebP para quien lo soporta (13 kB) y
 * PNG como alternativa (41 kB). El original de marca son 494 kB a 2038 px de
 * ancho, un peso que no tiene sentido pagar en cada página para pintar una
 * imagen de menos de cien píxeles.
 */
export default function LogoYima({ className = "h-8", decorativo = false }) {
  return (
    <picture>
      <source srcSet="/logo-yima-160.webp" type="image/webp" />
      <img
        src="/logo-yima-160.png"
        // Un logo decorativo es el que acompaña a un texto que ya dice la marca
        // (el "YIMA ADMIN" del panel): ahí repetirlo obligaría a escuchar el
        // nombre dos veces seguidas.
        alt={decorativo ? "" : "YIMA"}
        width={470}
        height={160}
        loading="eager"
        decoding="async"
        // `logo-yima` no aporta estilo por sí sola: es el enganche de la regla
        // de `index.css` que realza el logo sobre las superficies oscuras del
        // admin, donde el teal de la marca queda apagado.
        className={`logo-yima w-auto ${className}`}
      />
    </picture>
  );
}
