import { useEffect, useRef, useState } from "react";
import SelectorCantidad from "./SelectorCantidad.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { registrarEvento } from "../api/products.js";
import { AREA_TACTIL_ANCHA } from "../utils/areaTactil.js";
import { useToast } from "../context/useToast.js";

/**
 * Price-panel CTA for the product detail page (Sprint 5 Task 2) — the first
 * CTA that panel has ever had (see ProductoDetalle.jsx's doc comment on the
 * prior "no CTA" decision, now superseded by the cart feature).
 *
 * CANTIDAD CONTROLADA (`cantidad` + `onCantidadChange`): cuando una pantalla
 * monta este CTA MÁS DE UNA VEZ para el mismo producto —`FichaProducto` lo
 * hace: el bloque de precio y la barra fija inferior, las dos visibles a la
 * vez por debajo de `md`— el estado interno era una trampa de facturación.
 * El cliente elegía 2 unidades en una instancia, tocaba AGREGAR en la otra y
 * el carrito recibía 1: se facturaba de menos, sin error y sin aviso. Con las
 * dos props la cantidad vive en el padre y hay UN solo número.
 *
 * Sin ellas el componente sigue siendo autónomo (una sola instancia en
 * pantalla no necesita coordinarse con nadie).
 *
 * UNA sola forma (13/09/2026): hubo una variante "normal" ("Agregar al
 * carrito", `h-10`, con ícono) y una `compacto` para la barra fija. Cuando el
 * bloque de compra de la ficha también pasó a la compacta, la normal quedó
 * sin uso y se borró junto con la prop.
 */
function BotonAgregarCarrito({
  producto,
  alineacion = "end",
  cantidad: cantidadControlada,
  onCantidadChange,
}) {
  const { carrito, agregar } = useCarrito();
  const { mostrarToast } = useToast();
  const [cantidadInterna, setCantidadInterna] = useState(1);
  const [agregado, setAgregado] = useState(false);

  // Se exige el PAR completo: una `cantidad` sin `onCantidadChange` dejaría el
  // selector congelado, y un `onCantidadChange` sin `cantidad` avisaría de un
  // valor que el padre no muestra. Faltando cualquiera de las dos, el
  // componente cae a su estado propio en vez de quedar a medio controlar.
  const controlado = Number.isInteger(cantidadControlada) && typeof onCantidadChange === "function";
  const cantidad = controlado ? cantidadControlada : cantidadInterna;
  const setCantidad = controlado ? onCantidadChange : setCantidadInterna;

  // El timer de feedback se guarda para limpiarlo al desmontar: en React 18
  // un setState tras el unmount es un no-op silencioso, pero el timer queda
  // vivo igual — y un click justo antes de navegar lo dejaba colgado.
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Un producto agotado se sigue mostrando en su ficha, pero no se puede
  // comprar: el CTA queda deshabilitado. El backend rechaza igual la orden
  // (`ordenes.controller.js`), así que esto es UX, no la defensa real.
  const sinStock = producto.stock <= 0;

  // Clamp contra el stock VIVO, solo cuando se lo conoce (un payload sin el
  // campo no inventa tope). Lo ya agregado al carrito descuenta margen: con
  // stock 2 y 1 en el carrito solo se puede agregar 1 más — sin esto el
  // backend aceptaba la orden imposible de cumplir (valida stock > 0, no
  // cantidad contra stock).
  const stockConocido = Number.isInteger(producto.stock);
  const enCarrito = carrito.find((l) => l.productId === producto.id)?.cantidad ?? 0;
  const disponible = stockConocido ? Math.max(0, producto.stock - enCarrito) : null;
  // Extiende el estado deshabilitado de `sinStock`: hay stock, pero ya está
  // todo en el carrito. Etiqueta propia para no mentir con "Sin stock".
  const sinMargen = stockConocido && !sinStock && disponible === 0;
  // Lo que se muestra es lo que se agrega: si el margen bajó por debajo de lo
  // seleccionado (otro click, otra pestaña), el selector lo refleja en vez de
  // agregar en silencio menos de lo que el número decía.
  const cantidadEfectiva = disponible !== null && disponible > 0 ? Math.min(cantidad, disponible) : cantidad;

  function handleClick() {
    if (sinStock || sinMargen) return;

    // Re-entrancy guard: while `agregado` is true (the whole 2.5s feedback
    // window, not just the click instant) a second click/tap is a no-op.
    // Without this, a fast double-click/double-tap calls `agregar` twice —
    // double the selected quantity in the cart plus a duplicate
    // AGREGADO_CARRITO event.
    if (agregado) return;

    agregar({ productId: producto.id }, cantidadEfectiva);

    // Mismo toast que ya muestran `BotonAgregar.jsx` (tarjeta de catálogo) y
    // los combos (`TarjetaCombo.jsx`/`PaginaCombo.jsx`) — este era el único
    // punto de alta que solo daba el feedback inline "Agregado", sin avisar
    // con el toast global. A diferencia de esos, este CTA puede agregar MÁS
    // de 1 unidad por click: con `cantidadEfectiva > 1` el mensaje lo dice,
    // para no sugerir que se cargó una sola unidad.
    mostrarToast(
      cantidadEfectiva > 1
        ? `${cantidadEfectiva} × ${producto.nombre} agregados al carrito`
        : `${producto.nombre} agregado al carrito`,
      {
        foto: producto.fotos?.[0] ? { url: producto.fotos[0].url, alt: producto.nombre } : null,
        accion: { texto: "Ver carrito", to: "/carrito" },
      },
    );

    // Fire-and-forget analytics, same non-blocking pattern as
    // BotonCompartir/BotonFavorito — never awaited, never allowed to affect
    // the button's own success feedback below.
    registrarEvento("AGREGADO_CARRITO", producto.id);

    setAgregado(true);
    // Reset the selector back to its default: adding confirms the chosen
    // quantity, the next decision starts fresh at 1 instead of silently
    // reusing the last value on a later click.
    setCantidad(1);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAgregado(false), 2500);
  }

  const deshabilitado = sinStock || sinMargen;

  return (
    <div
      // NO puede partir la fila. Medido el 13/09/2026 a 390px, con `flex-wrap`
      // el botón bajaba a un segundo renglón (grupo de 281px contra 252
      // disponibles) y la barra fija de la ficha pasaba a 126px de alto.
      className={`flex flex-nowrap items-center gap-2 ${
        alineacion === "start" ? "justify-start" : "justify-end"
      }`}
    >
      {deshabilitado ? null : (
        <SelectorCantidad value={cantidadEfectiva} onChange={setCantidad} max={disponible ?? undefined} />
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={agregado || deshabilitado}
        // Muestra "Agregar", pero el nombre accesible dice qué hace (contiene
        // el texto visible, WCAG 2.5.3). En los otros estados manda el texto.
        aria-label={!agregado && !deshabilitado ? "Agregar al carrito" : undefined}
        // Se DIBUJA en 36px (`h-9`) con `label-md`, sin `tracking-wide`: con
        // 44px visibles y `label-lg` se veía enorme en la barra fija
        // (13/09/2026). El área táctil llega a 44 por pseudo-elemento
        // (`AREA_TACTIL_ANCHA`), igual que `SelectorCantidad`, que va pegado al
        // lado con el mismo alto. Medido en navegador: 97x44 efectivos.
        // `whitespace-nowrap` evita que "Máximo en carrito" parta el botón.
        className={`font-label-md text-label-md inline-flex h-9 items-center whitespace-nowrap rounded-full bg-primary px-3 uppercase text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 ${AREA_TACTIL_ANCHA}`}
      >
        {/* Sin ícono en ningún estado: a 360px eran los 20px que faltaban para
            que la barra fija entre en una línea, y "Agregado ✓" con ícono ya
            desbordaba a 390px (medido el 13/09/2026). Al lado del precio el
            texto solo alcanza. De paso desaparece la trampa del ligature del
            ícono dentro del nombre accesible ("shopping_cart Agregar al
            carrito", 07/09/2026). */}
        {sinStock ? "Sin stock" : sinMargen ? "Máximo en carrito" : agregado ? "Agregado" : "Agregar"}
      </button>
    </div>
  );
}

export default BotonAgregarCarrito;
