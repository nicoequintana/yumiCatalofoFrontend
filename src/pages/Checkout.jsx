import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BotonVolver from "../components/BotonVolver.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import useCarrito, { storageDisponible } from "../hooks/useCarrito.js";
import usePerfilCliente from "../hooks/usePerfilCliente.js";
import useProductosCarrito from "../hooks/useProductosCarrito.js";
import useCombosCarrito from "../hooks/useCombosCarrito.js";
import ProductosDeCombo from "../components/ProductosDeCombo.jsx";
import { crearOrden } from "../api/ordenes.js";
import { formatPrecio, precioACentavos } from "../utils/formato.js";
import { urlAbsoluta } from "../constants/seo.js";
import { precioAPagar } from "../utils/precioEfectivo.js";
import { MENSAJE_ERROR_CARGA } from "../hooks/useOfertas.js";

/**
 * `/checkout` — checkout CON SESIÓN (spec "Checkout autenticado").
 *
 * Dejó de pedir dni/nombre/teléfono/email como campos libres: esos datos salen
 * de la cuenta y se MUESTRAN de solo lectura (el DNI no se muestra en esta
 * card: ver "Mi cuenta"). El botón "Editar" ya NO abre un panel inline: lleva
 * a `/cuenta/datos` —la misma pantalla de "Mis datos" que usa Mi cuenta—, que
 * vuelve por el HISTORIAL (`useVolver`) y no necesita ningún parámetro para
 * saber que hay que volver acá. El pedido no vuelve a mandar
 * `nombre`/`telefono`/`dni`: el backend los toma directo de la cuenta. El
 * email nunca se edita.
 *
 * Bajo `RequireAuthCliente` el perfil llega completo (el guard no deja pasar sin
 * `nombre`/`telefono`/`dni`), pero esta pantalla igual mira los tres estados de
 * `usePerfilCliente` por su cuenta: hoy la ruta todavía no está envuelta por el
 * guard, y aunque lo estuviera, la sesión puede vencerse mientras la persona
 * completa el pedido.
 *
 * ⚠️ **Sin sesión NO se envía nada.** Con el flag apagado, el backend toma un
 * request sin cookie como checkout de INVITADO: ignora `claveIdempotencia`, saca
 * el contacto del body y escribe `cuentaClienteId: null` — una orden que no
 * aparece nunca en "Mis pedidos" y que un reenvío DUPLICA, porque sin sesión no
 * hay clave que arbitre. "Creía tener sesión" se resuelve volviendo a entrar,
 * jamás cayendo a un envío de invitado.
 */

/**
 * El borrador vive en `sessionStorage` (no en `localStorage`): es de ESTA
 * pestaña y de este intento de compra, no una preferencia que deba sobrevivir
 * al cierre del navegador.
 *
 * ⚠️ `OrdenConfirmada.jsx` limpia esta misma clave: si cambia acá, cambia allá.
 */
const STORAGE_KEY_BORRADOR = "yumi-checkout-borrador";

/**
 * A dónde vuelve el login. Es la constante `/checkout` y no `useLocation()` a
 * propósito: esta pantalla vive en esa ruta y en ninguna otra, y leer la
 * ubicación acá solo agregaría una forma de que el `volverA` salga mal.
 */
const RUTA_PROPIA = "/checkout";

/**
 * Lo primero que el cliente necesita saber cuando el submit falla NO es qué se
 * rompió, sino si su pedido existe. El mensaje de reintento es el compartido de
 * `useOfertas.js`, no una tercera redacción del mismo consejo.
 */
const MENSAJE_ERROR_ENVIO = `No pudimos confirmar tu compra: no se generó ningún pedido y no se te cobró nada. ${MENSAJE_ERROR_CARGA}`;

function leerBorrador() {
  try {
    const crudo = sessionStorage.getItem(STORAGE_KEY_BORRADOR);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function escribirBorrador(borrador) {
  try {
    sessionStorage.setItem(STORAGE_KEY_BORRADOR, JSON.stringify(borrador));
  } catch {
    // Best-effort: un storage bloqueado no puede tumbar el formulario, solo
    // pierde la persistencia entre remontes.
  }
}

function borrarBorrador() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_BORRADOR);
  } catch {
    // Ídem: no hay nada que hacer, y no vale romper la confirmación por esto.
  }
}

function Checkout() {
  const navigate = useNavigate();
  const { carrito } = useCarrito();
  const { perfil, resuelto, error: errorSesion } = usePerfilCliente();

  // Se lee UNA vez, con initializer perezoso: leerlo en cada render volvería a
  // parsear el JSON a cada tecla del campo de notas.
  const [borradorInicial] = useState(leerBorrador);

  const [notas, setNotas] = useState(borradorInicial?.notas ?? "");

  const [errorEnvio, setErrorEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * Una sola clave por INTENTO DE COMPRA, no por submit ni por montaje: dos
   * clicks en "Confirmar pedido" —el dedo que hace doble click, el reintento
   * tras un timeout— tienen que viajar con la MISMA clave para que el backend
   * los trate como el mismo intento y conteste 200 con la orden que ya existe.
   *
   * Por eso se persiste en el borrador y no solo en un ref: un F5 justo después
   * de un envío que sí llegó estrenaría una clave nueva, y el backend crearía
   * una SEGUNDA orden sin forma de saber que era la misma compra.
   */
  const claveIdempotenciaRef = useRef(null);
  if (claveIdempotenciaRef.current === null) {
    claveIdempotenciaRef.current = borradorInicial?.clave ?? crypto.randomUUID();
  }

  // Se levanta al confirmar: sin esto, un re-render posterior al éxito podría
  // reescribir el borrador que se acaba de borrar y dejar la clave ya usada
  // esperando a la compra siguiente.
  const descartado = useRef(false);

  useEffect(() => {
    if (descartado.current) return;
    escribirBorrador({ notas, clave: claveIdempotenciaRef.current });
  }, [notas]);

  // Mismas claves que `Carrito.jsx`: una por fuente, sin las cantidades.
  const claveIds = [...new Set(carrito.filter((l) => l.productId !== undefined).map((l) => l.productId))]
    .sort((a, b) => a - b)
    .join(",");
  const claveIdsCombo = [...new Set(carrito.filter((l) => l.comboId !== undefined).map((l) => l.comboId))]
    .sort((a, b) => a - b)
    .join(",");

  // Mismos hooks que `Carrito.jsx`: al llegar desde el carrito los datos ya
  // están cacheados y no se pinta "Cargando checkout…". Mientras CUALQUIERA de
  // los dos refetch vivos no contesta (`revalidando`), el total es del cache
  // —que puede tener horas— y "Confirmar pedido" queda deshabilitado: nadie
  // confirma un precio sin verificar.
  const productosCarrito = useProductosCarrito(claveIds);
  const combosCarrito = useCombosCarrito(claveIdsCombo);
  const { productos } = productosCarrito;
  const { combos } = combosCarrito;
  const cargando = productosCarrito.cargando || combosCarrito.cargando;
  const revalidando = productosCarrito.revalidando || combosCarrito.revalidando;
  const errorCarga = productosCarrito.error || combosCarrito.error ? MENSAJE_ERROR_CARGA : null;

  const productosPorId = new Map(productos.map((p) => [p.id, p]));
  const combosPorId = new Map(combos.map((c) => [c.id, c]));

  const lineas = carrito.map((linea) => {
    if (linea.comboId !== undefined) {
      const combo = combosPorId.get(linea.comboId);
      // `vigente`, `disponible` y `alcanza` llegan resueltos del backend: acá
      // solo se comparan. Más combos que los que alcanza el stock también
      // bloquea: el ajuste se hace en el carrito, nunca en silencio.
      const bloqueado = !combo || !combo.vigente || !combo.disponible || linea.cantidad > combo.alcanza;
      return { ...linea, tipo: "COMBO", combo, noDisponible: bloqueado };
    }
    const producto = productosPorId.get(linea.productId);
    return { ...linea, tipo: "PRODUCTO", producto, noDisponible: !producto };
  });

  const lineasValidas = lineas.filter((l) => !l.noDisponible);
  // Un producto borrado se descarta del pedido con aviso; un combo bloqueado NO
  // se descarta en silencio: el pedido saldría sin el combo que el cliente
  // eligió (spec §7.7), así que bloquea "Confirmar pedido" hasta resolverlo.
  const hayProblemas = lineas.some((l) => l.tipo === "PRODUCTO" && l.noDisponible);
  const hayCombosBloqueados = lineas.some((l) => l.tipo === "COMBO" && l.noDisponible);

  // Se acumula en centavos ENTEROS: sumar floats línea a línea acumula drift.
  // Solo cuenta las líneas válidas, que son exactamente las que se envían. Un
  // combo suma su `precioCombo` tal cual lo emitió el backend.
  const totalCentavos = lineasValidas.reduce(
    (total, l) =>
      total + precioACentavos(l.tipo === "COMBO" ? l.combo.precioCombo : precioAPagar(l.producto)) * l.cantidad,
    0,
  );
  const total = formatPrecio(totalCentavos / 100);

  // Redirige a /carrito si no hay nada que checkear. Se espera a que termine el
  // fetch para no redirigir mientras `productos` está vacío por estar cargando.
  // Si el fetch FALLÓ no se redirige: `productos` está vacío por la falla, no
  // porque el carrito lo esté, y allá se vería el mismo error.
  useEffect(() => {
    if (cargando || errorCarga) return;
    if (lineasValidas.length === 0) {
      navigate("/carrito", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, errorCarga, lineasValidas.length, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorEnvio(null);
    if (lineasValidas.length === 0) return;
    // Mismo criterio que el `disabled` del botón: sin precios verificados no se envía.
    if (revalidando) return;
    // Mismo criterio: sin el combo el pedido saldría incompleto.
    if (hayCombosBloqueados) return;
    // Defensa en profundidad: sin perfil esta pantalla ni siquiera renderiza el
    // botón, pero un envío sin sesión se convertiría en una orden de invitado
    // silenciosa. La guarda se queda acá también.
    if (!perfil) return;

    setEnviando(true);
    try {
      const orden = await crearOrden({
        items: lineasValidas.map((l) =>
          l.tipo === "COMBO"
            ? { comboId: l.comboId, cantidad: l.cantidad }
            : { productId: l.productId, cantidad: l.cantidad },
        ),
        notas: notas.trim() || undefined,
        claveIdempotencia: claveIdempotenciaRef.current,
      });

      // El borrador muere con la compra: su clave de idempotencia ya se usó, y
      // reutilizarla en el pedido SIGUIENTE de esta pestaña haría que el backend
      // conteste 200 con la orden vieja.
      descartado.current = true;
      borrarBorrador();

      // El carrito se vacía recién en OrdenConfirmada.jsx al montar, no acá: si
      // la navegación se interrumpe, el carrito no se pierde.
      navigate("/checkout/confirmacion", { state: { orden } });
    } catch (err) {
      // El detalle del backend se conserva como SEGUNDA línea, nunca como
      // titular: hay errores que sí sirven ("Stock insuficiente para X").
      setErrorEnvio({ mensaje: MENSAJE_ERROR_ENVIO, detalle: err?.message || null });
      setEnviando(false);
    }
  }

  const metaSeo = (
    <MetaSeo
      titulo="Finalizar compra — YIMA"
      descripcion="Confirmá los datos de tu cuenta para completar el pedido."
      canonical={urlAbsoluta(RUTA_PROPIA)}
      noindex
    />
  );

  // `!resuelto` va junto con `cargando`: hasta que el perfil se resuelva no se
  // puede decidir ninguna de las ramas de abajo sin mostrar algo falso.
  if (cargando || !resuelto) {
    return (
      <>
        {metaSeo}
        <EstadoVacio icono="hourglass_empty" mensaje="Cargando checkout…" />
      </>
    );
  }

  if (errorCarga) {
    return (
      <>
        {metaSeo}
        <EstadoVacio icono="cloud_off" titulo="No pudimos cargar tu pedido" mensaje={errorCarga} />
      </>
    );
  }

  // ORDEN DELIBERADO: el error de verificación va ANTES que `!perfil`. Los dos
  // llegan con `perfil: null`, y lo único que los separa es `error`. Mandar a
  // login a alguien cuya verificación se cayó le haría creer que se le venció la
  // sesión, y volver a entrar no le arregla nada.
  if (errorSesion) {
    return (
      <>
        {metaSeo}
        <EstadoVacio
          icono="cloud_off"
          titulo="No pudimos verificar tu sesión"
          mensaje={MENSAJE_ERROR_CARGA}
        />
      </>
    );
  }

  if (!perfil) {
    return (
      <>
        {metaSeo}
        <section className="mx-auto flex w-full max-w-container-max flex-col items-center px-margin-mobile py-16 md:px-margin-desktop md:py-24">
          <EstadoVacio
            icono="lock"
            titulo="Iniciá sesión para terminar tu compra"
            mensaje="Tu pedido queda guardado en tu cuenta, así podés seguirlo desde Mis pedidos."
          />
          <div className="-mt-12 flex flex-col items-center gap-4 text-center">
            {/*
              El aviso va ANTES de mandar a login, que es el único momento en el
              que sirve: `escribirCarrito` se traga el error de storage, así que
              sin esto la persona vuelve del login a un carrito vacío y sin
              ninguna explicación de qué pasó.
            */}
            {!storageDisponible() ? (
              <p
                role="status"
                className="max-w-md rounded-lg bg-tertiary-container px-4 py-3 font-body-md text-body-md text-on-surface"
              >
                Tu navegador tiene el almacenamiento bloqueado: no vamos a poder guardar tu carrito
                mientras iniciás sesión. Anotá lo que elegiste antes de seguir.
              </p>
            ) : null}
            <Link
              to={`/cuenta/entrar?volverA=${encodeURIComponent(RUTA_PROPIA)}`}
              className="font-label-lg text-label-lg inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 py-3 uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
            >
              Iniciar sesión
            </Link>
          </div>
        </section>
      </>
    );
  }

  // Mientras el efecto de redirección todavía no corrió (mismo render en el que
  // `lineasValidas` quedó en 0), no renderizar el formulario.
  if (lineasValidas.length === 0) {
    return null;
  }

  return (
    <>
      {metaSeo}
      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="mb-6">
          <BotonVolver fallback="/carrito" />
        </div>

        <div className="mb-16 flex flex-col items-center">
          <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
            Un paso más
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">
            Finalizar compra
          </h1>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {hayProblemas ? (
            <p className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
              Algunos productos de tu carrito ya no están disponibles y no se van a incluir en el
              pedido. Podés revisarlos en el carrito.
            </p>
          ) : null}

          {hayCombosBloqueados ? (
            <p className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
              Algunos combos de tu carrito ya no están disponibles o no tienen stock. Revisalos en el
              carrito antes de confirmar.
            </p>
          ) : null}

          {/* El último paso donde todavía se puede desistir: el comprador tiene
              que ver cuánto va a pagar ANTES de confirmar. */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <ul className="flex flex-col gap-3">
              {lineasValidas.map((l) =>
                l.tipo === "COMBO" ? (
                  <li key={`combo-${l.comboId}`} className="flex items-center justify-between gap-4">
                    <span className="flex flex-col">
                      <span className="font-body-md text-body-md text-on-surface">
                        {l.cantidad} × {l.combo.nombre}
                      </span>
                      <ProductosDeCombo
                        productos={l.combo.items.map((item) => ({ nombreProducto: item.nombre, cantidad: item.cantidad }))}
                        className="font-body-md text-[13px] text-on-surface-variant"
                      />
                    </span>
                    <span className="font-body-md text-body-md shrink-0 text-on-surface">
                      {formatPrecio((precioACentavos(l.combo.precioCombo) * l.cantidad) / 100)}
                    </span>
                  </li>
                ) : (
                  <li key={`producto-${l.productId}`} className="flex items-center justify-between gap-4">
                    <span className="font-body-md text-body-md text-on-surface">
                      {l.cantidad} × {l.producto.nombre}
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-body-md text-body-md text-on-surface">
                        {formatPrecio((precioACentavos(precioAPagar(l.producto)) * l.cantidad) / 100)}
                      </span>
                      <span className="font-body-md text-[13px] text-on-surface-variant">
                        {formatPrecio(precioAPagar(l.producto))} c/u
                      </span>
                    </span>
                  </li>
                ),
              )}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-outline-variant pt-4">
              <span className="font-label-md text-label-md uppercase tracking-widest text-on-surface">
                Total
              </span>
              <span
                data-testid="checkout-total"
                className="font-body-lg text-body-lg font-semibold text-on-surface"
              >
                {total}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-label-md text-label-md text-on-surface">Datos de entrega</span>
              <Link
                to="/cuenta/datos"
                className="font-label-lg text-label-lg inline-flex min-h-11 items-center text-primary underline"
              >
                Editar
              </Link>
            </div>

            <p className="mt-2 font-body-md text-body-md text-on-surface">{perfil.email}</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Para cambiarlo, andá a Mi cuenta.
            </p>

            <div className="mt-3 flex flex-col gap-1 font-body-md text-body-md text-on-surface">
              <span>{perfil.nombre}</span>
              <span>{perfil.telefono}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="notas" className="font-label-md text-label-md text-on-surface">
                Notas (opcional)
              </label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
              />
            </div>

            {errorEnvio ? (
              <p
                role="alert"
                className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
              >
                {errorEnvio.mensaje}
                {errorEnvio.detalle ? (
                  <span className="mt-1 block text-[13px]">Detalle: {errorEnvio.detalle}</span>
                ) : null}
              </p>
            ) : null}

            {revalidando ? (
              <p role="status" className="font-body-md text-body-md text-on-surface-variant">
                Actualizando precios…
              </p>
            ) : null}

            <button
              type="submit"
              disabled={enviando || revalidando || hayCombosBloqueados}
              className="font-label-lg text-label-lg inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant"
            >
              {enviando ? "Enviando…" : "Confirmar pedido"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

export default Checkout;
