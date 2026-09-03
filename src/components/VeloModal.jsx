import useBloquearScroll from "../hooks/useBloquearScroll.js";

/**
 * El velo de todo diálogo modal: oscurece, **desenfoca** y frena el scroll de
 * atrás.
 *
 * Existe porque las dos cosas que hace estaban decididas —o ausentes— en ocho
 * lugares distintos. Seis diálogos del panel escribían su propio
 * `fixed inset-0` y **ninguno bloqueaba el scroll**: el gesto sobre el velo
 * movía la página de abajo, y el modal se leía como despegado de la pantalla.
 * Poner el desenfoque en cada uno habría sido la novena copia de la misma
 * decisión.
 *
 * **El bloqueo sale gratis por el ciclo de vida.** Este componente se monta
 * solo cuando el diálogo se renderiza, así que `useBloquearScroll(true)` alcanza
 * — no hay que pasarle a cada pantalla la condición de apertura, que es
 * justamente lo que se podía escribir mal en seis lugares.
 *
 * ⚠️ **`backdrop-filter` convierte a este `<div>` en el bloque contenedor de
 * sus descendientes `fixed`.** Es la misma trampa que documenta `Navbar.jsx`
 * —donde costó un velo que no velaba nada— y acá importa igual: **un elemento
 * `fixed` adentro de un diálogo dejaría de posicionarse contra la ventana y
 * pasaría a hacerlo contra este velo**. Hoy ningún diálogo tiene uno; el día
 * que haga falta, va como hermano del velo, no adentro.
 *
 * SIN `@supports`, y es deliberado. El fallback de `.vidrio-header` existe
 * porque ahí la ausencia de desenfoque deja texto nítido debajo de texto, que
 * es peor que no haber intentado nada. Acá no: sin `backdrop-filter` queda el
 * velo semitransparente de siempre, que es exactamente cómo se comportaban
 * estos diálogos antes de esta feature. La degradación es el estado anterior.
 *
 * El tinte y la capa (`z-*`, `bg-*`) siguen viniendo de cada pantalla: son
 * decisiones locales y hoy no son uniformes. Lo único que se comparte es lo que
 * tiene que ser igual en todos lados.
 */
export default function VeloModal({ className = "", children }) {
  useBloquearScroll(true);

  return <div className={`fixed inset-0 backdrop-blur ${className}`}>{children}</div>;
}
