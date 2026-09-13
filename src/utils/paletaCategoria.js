/**
 * Paleta de degradés para los círculos de categoría, asignada de forma
 * DETERMINÍSTICA por slug — presentación pura, no es un dato del negocio: no
 * viaja por la API, no suma migración, y el mismo slug siempre cae en el
 * mismo color entre una carga y otra. Tonos tomados de la familia de tokens
 * del público (T1, `.tema-publico` en `index.css`): primary/secondary/tertiary
 * y sus containers, en pares claros→oscuros para el degradé radial.
 *
 * Los mismos 5 pares están documentados como custom properties en
 * `index.css` bajo `.tema-publico` (`--color-circulo-categoria-N-from/to`) —
 * un test en `tokens.test.js` los mantiene sincronizados con este array. No
 * se LEEN desde ahí en runtime porque `colorParaSlug` tiene que devolver un
 * triple "R G B" literal para el `style` inline del degradé radial (no hay
 * clase Tailwind posible para un color elegido en runtime por slug).
 */
export const PALETA_CATEGORIA = [
  { from: "20 72 85", to: "0 49 60" }, // primary-container → primary
  { from: "254 121 73", to: "167 58 12" }, // secondary-container → secondary
  { from: "0 77 32", to: "0 52 19" }, // tertiary-container → tertiary
  { from: "135 182 197", to: "20 72 85" }, // on-primary-container → primary-container
  { from: "104 29 0", to: "167 58 12" }, // on-secondary-container → secondary
];

export function colorParaSlug(slug) {
  const suma = String(slug)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PALETA_CATEGORIA[suma % PALETA_CATEGORIA.length];
}
