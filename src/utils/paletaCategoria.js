/**
 * Familias de la paleta pastel de los círculos de categoría — cada nombre
 * referencia tres custom properties en canales bajo `.tema-publico`
 * (`index.css`): `--circulo-<familia>-claro` y `-profundo` (las dos paradas
 * del degradé radial) e `-icono` (un tono oscuro de la MISMA familia, nunca
 * blanco sobre un color saturado — así es el disco del mockup aprobado).
 *
 * **Los valores numéricos viven SOLO en `index.css`.** Este archivo no
 * duplica ni un canal: `colorParaSlug` devuelve el NOMBRE de la familia, y el
 * componente arma `rgb(var(--circulo-<familia>-<canal>))`. Antes (primera
 * versión de T13) este módulo tenía un array de pares `{ from, to }` con RGB
 * literal — la review lo marcó como una segunda copia de `index.css` que
 * podía desincronizarse en silencio, y pidió una sola fuente de verdad.
 *
 * `colorParaSlug` hashea el string (suma de código de carácter, `%
 * paleta.length`) para elegir la familia de forma DETERMINÍSTICA — el mismo
 * slug siempre cae en la misma familia entre una carga y otra.
 */
export const FAMILIAS_CATEGORIA = ["arena", "terracota", "salvia", "teal", "cielo", "lila", "rosa"];

export function colorParaSlug(slug) {
  const suma = String(slug)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FAMILIAS_CATEGORIA[suma % FAMILIAS_CATEGORIA.length];
}
