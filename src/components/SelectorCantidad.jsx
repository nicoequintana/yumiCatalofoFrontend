import { AREA_TACTIL_ICONO } from "../utils/areaTactil.js";

/**
 * Small +/− quantity stepper. Decrementing below `min` (defaults to 1, since
 * an active cart line can't display quantity 0 through this widget) is a
 * no-op — `onChange` simply isn't called, it never fires with `min - 1`.
 * This is a UI-only floor: it does NOT enforce cart business rules like
 * `useCarrito`'s `actualizarCantidad(id, 0)` removing a line — that's a
 * separate, deliberate behavior reachable from other code paths (e.g. a
 * "remove" action), not from this widget's own decrement button.
 *
 * `max` es opcional y simétrico a `min`: en el tope, incrementar es un no-op
 * y el botón + queda deshabilitado. Sin `max` no hay tope — los llamadores
 * solo lo pasan cuando conocen el stock vivo; el widget no inventa límites.
 *
 * `etiqueta` es opcional: con varios steppers en la misma pantalla (las filas
 * del editor de combos) nombra DE QUÉ es la cantidad — "Aumentar cantidad de
 * Lámpara" —, así un lector de pantalla no oye N botones idénticos. Sin ella
 * los nombres son los de siempre.
 *
 * `sobreOscuro` es opcional: cambia SOLO los colores (aro, íconos y número
 * claros) para montarlo sobre el talón teal de `PaginaCombo`, donde los de
 * siempre quedaban oscuro sobre oscuro (15/09/2026). La forma no cambia.
 * Aro en `on-primary/40` y no el `.35` del diseño: 3.46:1 contra `primary`
 * pasa el 3:1 de un borde de control; `.35` daba 2.98:1.
 */
function SelectorCantidad({ value, onChange, min = 1, max, etiqueta, sobreOscuro = false }) {
  const enMaximo = Number.isInteger(max) && value >= max;

  // Un botón deshabilitado sin motivo se lee como una app rota. El nombre
  // accesible del propio botón dice por qué, en vez de dejar que el motivo
  // exista solo en el CTA de al lado ("Máximo en carrito"), que un lector de
  // pantalla no asocia con este control.
  const deQue = etiqueta ? ` de ${etiqueta}` : "";
  const etiquetaAumentar = enMaximo
    ? `Aumentar cantidad${deQue} — ya alcanzaste el máximo disponible (${max})`
    : `Aumentar cantidad${deQue}`;

  function disminuir() {
    if (value <= min) return;
    onChange(value - 1);
  }

  function aumentar() {
    if (enMaximo) return;
    onChange(value + 1);
  }

  // UNA sola forma (13/09/2026). Hubo una variante normal (`h-10`, `min-h-11`,
  // `rounded-lg`) y una `compacto` para la barra fija de la ficha; al pasar la
  // ficha entera a la compacta, el carrito también la tomó y la normal se borró.
  //
  // Se DIBUJA en 36x36 y el área táctil llega a 44x44 por pseudo-elemento
  // (`AREA_TACTIL_ICONO`), mismo criterio que `BotonAgregarCarrito`, que va
  // pegado al lado con el mismo alto. Los dos botones quedan a 36 + el valor de
  // paso (más de 44), así que sus áreas no se pisan. Medido en navegador el
  // 13/09/2026 sobre `/producto/21`: 44x44 efectivos en cada botón. El piso
  // original era `min-h-11 min-w-11`: el 07/09/2026 la caja daba 40x41.
  const colores = sobreOscuro
    ? { boton: "text-on-primary hover:bg-on-primary/10", borde: "border-on-primary/40", valor: "text-on-primary" }
    : { boton: "text-on-surface-variant hover:bg-surface-container", borde: "border-outline-variant", valor: "text-on-surface" };
  const claseBoton = `flex h-9 w-9 items-center justify-center ${colores.boton} transition-colors disabled:opacity-30 disabled:hover:bg-transparent ${AREA_TACTIL_ICONO}`;

  return (
    // SIN `overflow-hidden`: recortaría el pseudo-elemento y el área táctil
    // volvería a 36. Las esquinas las redondea cada botón, y el `rounded-full`
    // acompaña la forma del botón de agregar.
    <div className={`inline-flex items-stretch rounded-full border ${colores.borde}`}>
      <button
        type="button"
        onClick={disminuir}
        aria-label={`Disminuir cantidad${deQue}`}
        disabled={value <= min}
        className={`${claseBoton} rounded-l-full`}
      >
        <span className="material-symbols-outlined text-[16px]">remove</span>
      </button>
      {/* `min-w-8`: la barra fija de la ficha necesitaba estos px para entrar
          en una línea a 390px (medido el 13/09/2026). */}
      <span
        className={`font-body-sm text-body-sm flex min-w-8 items-center justify-center border-x ${colores.borde} ${colores.valor}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={aumentar}
        aria-label={etiquetaAumentar}
        title={enMaximo ? etiquetaAumentar : undefined}
        disabled={enMaximo}
        className={`${claseBoton} rounded-r-full`}
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
      </button>
    </div>
  );
}

export default SelectorCantidad;
