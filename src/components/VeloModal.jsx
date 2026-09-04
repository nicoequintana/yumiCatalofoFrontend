import { createPortal } from "react-dom";
import useBloquearScroll from "../hooks/useBloquearScroll.js";

/**
 * El velo de todo diálogo modal: se monta en `body`, oscurece, **desenfoca** y
 * frena el scroll de atrás.
 *
 * Existe porque esas decisiones estaban tomadas —o ausentes— en ocho lugares
 * distintos. Seis diálogos del panel escribían su propio `fixed inset-0`,
 * **ninguno bloqueaba el scroll** y **ninguno se veía entero cuando era alto**.
 * Poner cada arreglo en cada uno habría sido la novena copia de la misma
 * decisión.
 *
 * ── PORTAL A `body` ──
 *
 * `AdminLayout` mete barra y contenido en un `relative z-10` —deliberado:
 * resuelve que el header móvil no tape los modales— pero deja la navegación
 * FUERA, para que sus capas se comparen contra la raíz. Consecuencia: un velo
 * renderizado dentro del outlet, **por más `z-50` que declare, tiene capa
 * efectiva 10**, y la bottom nav de escritorio (`z-40`, en la raíz) le gana
 * siempre. Con un diálogo corto no se notaba; con el formulario de campaña,
 * Guardar y Cancelar quedaban tapados y sin poder clickearse.
 *
 * Subirle el z-index NO lo arregla: adentro de un contexto de apilamiento el
 * número no se compara con nada de afuera. `createPortal(…, document.body)` es
 * lo único que lo saca, y es una propiedad del velo —de TODOS los velos—, no
 * de la pantalla que lo abre. Fue el primer portal del repo, y por eso queda
 * anotado.
 *
 * Del lado público no cambia nada: `Layout` no tiene ese contexto. Y el portal
 * es de hecho más seguro ahí, porque saca al velo de cualquier ancestro con
 * `backdrop-filter` (la trampa de `Navbar.jsx`).
 *
 * ── BLOQUEO DEL SCROLL ──
 *
 * Sale gratis por el ciclo de vida: este componente se monta solo cuando el
 * diálogo se renderiza, así que `useBloquearScroll(true)` alcanza — no hay que
 * pasarle a cada pantalla su condición de apertura, que es justamente lo que
 * se podía escribir mal en seis lugares.
 *
 * ── DOS TRAMPAS, LAS DOS VERIFICADAS EN EL NAVEGADOR ──
 *
 * ⚠️ **`backdrop-filter` convierte a este `<div>` en el bloque contenedor de
 * sus descendientes `fixed`.** Un elemento `fixed` adentro de un diálogo
 * dejaría de posicionarse contra la ventana y pasaría a hacerlo contra este
 * velo. Hoy ningún diálogo tiene uno; el día que haga falta, va como hermano.
 *
 * ⚠️ **`overflow: hidden` NO frena el scroll programático, solo el del
 * usuario.** `window.scrollBy` mueve la página igual con el bloqueo puesto;
 * una rueda real no la mueve nada. El guard afirma sobre el estilo por eso.
 *
 * SIN `@supports`, y es deliberado. El fallback de `.vidrio-header` existe
 * porque ahí la ausencia de desenfoque deja texto nítido debajo de texto. Acá
 * sin `backdrop-filter` queda el velo semitransparente de siempre, que es
 * exactamente cómo se comportaban estos diálogos antes. La degradación es el
 * estado anterior.
 *
 * El tinte y la capa (`z-*`, `bg-*`) siguen viniendo de cada pantalla: son
 * decisiones locales y hoy no son uniformes. Lo único que se comparte es lo que
 * tiene que ser igual en todos lados.
 */
export default function VeloModal({ className = "", children }) {
  useBloquearScroll(true);

  return createPortal(
    <div className={`fixed inset-0 backdrop-blur ${className}`}>{children}</div>,
    document.body,
  );
}
