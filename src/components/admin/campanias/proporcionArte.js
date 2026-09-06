/**
 * Cuánto recorta el slide un arte que no es apaisado, y cómo decírselo al admin.
 *
 * El arte del slide se pinta con `object-cover` dentro de una caja de **3,6:1
 * en escritorio y 2,9:1 en móvil** (`CarruselCampanias.jsx`). `cover` llena la
 * caja sin deformar, así que lo que sobra lo RECORTA — y una pieza cuadrada
 * dentro de una franja 3,6:1 pierde el 72 % de su alto.
 *
 * Eso no es un bug del CSS y no tiene arreglo del lado del código: o se recorta
 * (`cover`) o quedan bandas vacías a los lados (`contain`). Lo único que se
 * puede hacer es que el panel lo DIGA, en vez de dejar que alguien suba una
 * imagen cuadrada y descubra en la home que se ve una tira del medio.
 *
 * Pasó de verdad el 06/09/2026: dos artes subidos, uno de 2,5:1 y otro de 1:1,
 * y el segundo se veía recortadísimo sin que nada avisara por qué.
 */

/** El ratio de la caja en escritorio. Espeja el `aspect-[3.6/1]` de `CarruselCampanias.jsx`. */
export const RATIO_SLIDE = 3.6;

/** El de móvil, que recorta de los LADOS respecto del de escritorio. */
export const RATIO_SLIDE_MOVIL = 2.9;

/**
 * Por debajo de esto el recorte deja de ser un ajuste y se come la pieza.
 *
 * 2,4 y no 2,9 (el ratio de móvil) a propósito: un arte pensado para móvil es
 * legítimo y no merece un aviso, aunque en escritorio recorte algo. Lo que el
 * aviso persigue es la pieza que NO fue diseñada para una franja — un cuadrado,
 * un vertical, una foto de producto.
 */
const RATIO_MINIMO = 2.4;

/** La medida sugerida, en el texto que se le muestra al admin. */
export const MEDIDA_SUGERIDA = "1800 × 500 px (3,6:1)";

/**
 * Qué porcentaje del ALTO se pierde al encajar `ratio` en la caja de escritorio.
 *
 * Solo tiene sentido para un arte más "alto" que la caja (ratio menor): uno más
 * apaisado no pierde alto, pierde ancho, y eso casi nunca molesta porque el
 * copy vive en el tercio izquierdo.
 */
export function recorteVertical(ratio) {
  if (!ratio || ratio <= 0 || ratio >= RATIO_SLIDE) return 0;
  return Math.round((1 - ratio / RATIO_SLIDE) * 100);
}

/**
 * El aviso para un arte de `ancho`×`alto`, o `null` si la pieza está bien.
 *
 * Devuelve el texto ya armado —no un booleano— para que los dos editores no
 * tengan que redactar el mismo mensaje cada uno por su lado.
 */
export function avisoProporcionArte(ancho, alto) {
  if (!ancho || !alto) return null;

  const ratio = ancho / alto;
  if (ratio >= RATIO_MINIMO) return null;

  const perdido = recorteVertical(ratio);
  const forma = ratio > 0.95 && ratio < 1.05 ? "cuadrada" : "más alta que ancha";

  return (
    `Esta imagen es ${forma} y el slide es una franja apaisada, así que se le ` +
    `recorta cerca del ${perdido} % del alto: en la home se ve solo una tira del ` +
    `centro. Para que entre completa, subí una de ${MEDIDA_SUGERIDA}.`
  );
}
