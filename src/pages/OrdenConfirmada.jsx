import { useEffect, useRef } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import MetaSeo from "../components/MetaSeo.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { formatPrecio } from "../utils/formato.js";
import { urlAbsoluta } from "../constants/seo.js";

/**
 * `/checkout/confirmacion` — pantalla de éxito del checkout de invitado
 * (Sprint 6, Task 1). Recibe la orden creada vía router state
 * (`navigate(path, { state: { orden } })` desde `Checkout.jsx`), el único
 * mecanismo de paso de datos entre rutas que usa este codebase (sin store
 * global, per CLAUDE.md).
 *
 * El carrito se vacía ACÁ, al montar — deliberadamente NO en `Checkout.jsx`
 * justo después de que la request resuelve. Si se vaciara ahí, un fallo de
 * red a mitad de la navegación (o el usuario cerrando la pestaña antes de
 * que esta pantalla llegue a renderizar) dejaría al usuario sin carrito y
 * sin confirmación visible de que el pedido se hizo. Vaciar recién cuando
 * esta pantalla de éxito ya está montada garantiza que el carrito solo se
 * pierde cuando el usuario efectivamente vio la confirmación.
 *
 * Si no hay `state.orden` (navegación directa a la URL, o refresh — React
 * Router pierde el state en memoria al recargar), no hay nada que mostrar:
 * se redirige a `/` en vez de crashear o mostrar una confirmación vacía.
 * Se elige `/` (no `/carrito`) porque en este punto, si el usuario llegó acá
 * "legítimamente", su carrito ya fue vaciado en un mount anterior — volver a
 * `/carrito` mostraría un carrito vacío sin contexto; volver al home es la
 * salida más neutral.
 */
function OrdenConfirmada() {
  const location = useLocation();
  const orden = location.state?.orden;
  const { vaciar } = useCarrito();
  const vaciado = useRef(false);

  useEffect(() => {
    if (!orden) return;
    if (vaciado.current) return;
    vaciado.current = true;
    vaciar();
    // Corre una sola vez al montar, solo si hay una orden real para mostrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden]);

  if (!orden) {
    return <Navigate to="/" replace />;
  }

  const totalCentavos = orden.items.reduce((total, item) => {
    const numero = parseFloat(item.precioUnitario);
    const centavos = Number.isNaN(numero) ? 0 : Math.round(numero * 100);
    return total + centavos * item.cantidad;
  }, 0);

  return (
    <>
      <MetaSeo
        titulo="Pedido confirmado — YIMA"
        descripcion="Tu pedido fue registrado."
        canonical={urlAbsoluta("/checkout/confirmacion")}
        noindex
      />

      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <span className="material-symbols-outlined text-6xl text-secondary">
            check_circle
          </span>

          <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">
            ¡Pedido confirmado!
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Orden #{orden.id} recibida. Nos vamos a poner en contacto por WhatsApp o teléfono para
            coordinar el pago y la entrega.
          </p>

          <ul className="flex w-full flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left">
            {orden.items.map((item) => (
              <li key={item.id ?? item.productId} className="flex items-center justify-between gap-4">
                <span className="font-body-md text-body-md text-on-surface">
                  {item.cantidad} × {item.nombreProducto}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {formatPrecio(item.precioUnitario)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex w-full items-center justify-between border-t border-outline-variant pt-4">
            <span className="font-headline-md text-headline-md text-primary">Total</span>
            <strong className="font-headline-md text-headline-md text-primary">
              {formatPrecio(totalCentavos / 100)}
            </strong>
          </div>

          <Link
            to="/"
            className="font-label-md text-label-md inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
          >
            Volver al catálogo
          </Link>
        </div>
      </section>
    </>
  );
}

export default OrdenConfirmada;
