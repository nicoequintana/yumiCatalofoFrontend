/**
 * Solo la PASTILLA de la muestra: el fondo de cada color del slide, sin texto
 * encima. El par fondo/texto completo vive en `SlideCampania` (`COLORES`) —
 * acá alcanza con el fondo, porque la pastilla no lleva texto.
 *
 * **Módulo con un dueño único, no una copia por consumidor**: lo importan
 * `SeccionBanner.jsx` (campañas) y `SeccionBannerPromocion.jsx`
 * (promociones). Hasta el 06/09/2026 vivía inline en `SeccionBanner.jsx` y ya
 * era la TERCERA casa del censo de sincronizaciones de `CLAUDE.md`
 * (`lib/campanias.js` ↔ `SlideCampania.jsx` ↔ `SeccionBanner.jsx`); con el
 * editor de banner de promociones sumando su propio consumidor, copiarlo de
 * nuevo ahí hubiera sido la CUARTA. Sacarlo a este archivo **no bajó la
 * cuenta a dos** —sigue siendo un mapa espejo de la mitad "fondo" de
 * `SlideCampania.jsx`, y sigue habiendo que tocarlo a mano si el backend suma
 * un color— pero sí le dio a esa tercera casa un dueño ÚNICO en vez de uno
 * por consumidor, que es lo que evitó la cuarta.
 *
 * ⚠️ **No se puede importar directo de `SlideCampania.jsx`.** Exportar un mapa
 * además del componente le rompe el Fast Refresh de Vite (`oxlint` avisa
 * `react/only-export-components`, porque el archivo deja de exportar solo un
 * componente).
 *
 * El fallback de los dos consumidores es un color SIEMPRE VISIBLE
 * (`TERRACOTA`, espeja `COLOR_SLIDE_POR_DEFECTO` del backend) y no `""`: con
 * `""` un sexto color que el backend sumara mañana saldría con la etiqueta
 * correcta en la lista y la pastilla transparente, sin ningún error.
 */
export const MUESTRA_COLOR = {
  TERRACOTA: "bg-primary",
  VERDE: "bg-secondary",
  OCRE: "bg-tertiary-container",
  TINTA: "bg-inverse-surface",
  ARENA: "bg-surface-container-high",
};
