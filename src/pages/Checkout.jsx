import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BotonVolver from "../components/BotonVolver.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import useCarrito, { storageDisponible } from "../hooks/useCarrito.js";
import usePerfilCliente from "../hooks/usePerfilCliente.js";
import { getProductsByIds } from "../api/products.js";
import { crearOrden } from "../api/ordenes.js";
import { formatPrecio, precioACentavos } from "../utils/formato.js";
import { urlAbsoluta } from "../constants/seo.js";
import { precioAPagar } from "../utils/precioEfectivo.js";
import { MENSAJE_ERROR_CARGA } from "../hooks/useOfertas.js";

/**
 * `/checkout` — checkout CON SESIÓN (spec "Checkout autenticado").
 *
 * Dejó de pedir dni/nombre/teléfono/email como campos libres: esos datos salen
 * de la cuenta. Se MUESTRAN, con un botón "Editar" que abre los tres inputs
 * para corregirlos en el momento. El email nunca se edita acá.
 *
 * ⚠️ **Editar SÍ actualiza la cuenta.** `POST /ordenes` con sesión escribe
 * `nombre`/`telefono`/`dni` en `CuentaCliente` antes de crear la orden, y esa
 * escritura queda hecha aunque la orden después falle (por stock, por ejemplo).
 * Por eso los tres campos viajan SOLO cuando su valor DIFIERE del perfil: abrir
 * el panel y cerrarlo sin tocar nada no puede disparar una escritura de perfil.
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
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  // Se lee UNA vez, con initializer perezoso: leerlo en cada render volvería a
  // parsear el JSON a cada tecla del campo de notas.
  const [borradorInicial] = useState(leerBorrador);

  // `null` = el comprador no tocó "Editar". Cualquier otra cosa es el panel
  // abierto con sus tres valores. Guardar el objeto (y no un booleano aparte)
  // es lo que hace que una corrección sobreviva al remonte: el borrador
  // restaura los valores Y el hecho de que hubo edición.
  const [edicion, setEdicion] = useState(borradorInicial?.edicion ?? null);
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
    escribirBorrador({ notas, edicion, clave: claveIdempotenciaRef.current });
  }, [notas, edicion]);

  // Misma clave de refetch que `Carrito.jsx`: los ids del carrito, sin las
  // cantidades.
  const claveIds = [...new Set(carrito.map((l) => l.productId))].sort((a, b) => a - b).join(",");

  useEffect(() => {
    let activo = true;
    const ids = claveIds === "" ? [] : claveIds.split(",").map(Number);

    getProductsByIds(ids)
      .then((data) => {
        if (!activo) return;
        setProductos(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre, con el usuario a un paso de pagar.
      .catch(() => {
        if (!activo) return;
        setErrorCarga(MENSAJE_ERROR_CARGA);
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [claveIds]);

  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  const lineas = carrito.map((linea) => {
    const producto = productosPorId.get(linea.productId);
    return { ...linea, producto, noDisponible: !producto };
  });

  const lineasValidas = lineas.filter((l) => !l.noDisponible);
  const hayProblemas = lineas.some((l) => l.noDisponible);

  // Se acumula en centavos ENTEROS: sumar floats línea a línea acumula drift.
  // Solo cuenta las líneas válidas, que son exactamente las que se envían.
  const totalCentavos = lineasValidas.reduce(
    (total, l) => total + precioACentavos(precioAPagar(l.producto)) * l.cantidad,
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

  /**
   * Los campos de contacto que REALMENTE cambiaron. Un campo que quedó igual al
   * de la cuenta no viaja: escribiría el perfil sin que nadie lo haya pedido.
   */
  function contactoEditado() {
    if (!edicion || !perfil) return {};
    const cambios = {};
    for (const campo of ["nombre", "telefono", "dni"]) {
      const valor = (edicion[campo] ?? "").trim();
      if (valor !== "" && valor !== (perfil[campo] ?? "")) cambios[campo] = valor;
    }
    return cambios;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorEnvio(null);
    if (lineasValidas.length === 0) return;
    // Defensa en profundidad: sin perfil esta pantalla ni siquiera renderiza el
    // botón, pero un envío sin sesión se convertiría en una orden de invitado
    // silenciosa. La guarda se queda acá también.
    if (!perfil) return;

    setEnviando(true);
    try {
      const orden = await crearOrden({
        items: lineasValidas.map((l) => ({ productId: l.productId, cantidad: l.cantidad })),
        notas: notas.trim() || undefined,
        claveIdempotencia: claveIdempotenciaRef.current,
        ...contactoEditado(),
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
              className="font-label-md text-label-md inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 py-3 uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
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

  const editando = edicion !== null;

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

          {/* El último paso donde todavía se puede desistir: el comprador tiene
              que ver cuánto va a pagar ANTES de confirmar. */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <ul className="flex flex-col gap-3">
              {lineasValidas.map((l) => (
                <li key={l.productId} className="flex items-center justify-between gap-4">
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
              ))}
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
              {!editando ? (
                <button
                  type="button"
                  onClick={() =>
                    setEdicion({
                      nombre: perfil.nombre ?? "",
                      telefono: perfil.telefono ?? "",
                      dni: perfil.dni ?? "",
                    })
                  }
                  className="font-label-md text-label-md inline-flex min-h-11 items-center text-primary underline"
                >
                  Editar
                </button>
              ) : null}
            </div>

            <p className="mt-2 font-body-md text-body-md text-on-surface">{perfil.email}</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Para cambiarlo, andá a Mi cuenta.
            </p>

            {!editando ? (
              <div className="mt-3 flex flex-col gap-1 font-body-md text-body-md text-on-surface">
                <span>{perfil.nombre}</span>
                <span>{perfil.telefono}</span>
                <span>{perfil.dni}</span>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="nombre" className="font-label-md text-label-md text-on-surface">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    autoComplete="name"
                    value={edicion.nombre}
                    onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="telefono" className="font-label-md text-label-md text-on-surface">
                    Teléfono
                  </label>
                  <input
                    id="telefono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={edicion.telefono}
                    onChange={(e) => setEdicion({ ...edicion, telefono: e.target.value })}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="dni" className="font-label-md text-label-md text-on-surface">
                    DNI
                  </label>
                  {/* `inputMode="numeric"` abre el teclado numérico en el
                      celular; sigue siendo `type="text"` porque `number`
                      descarta los separadores que el backend sí acepta. */}
                  <input
                    id="dni"
                    type="text"
                    inputMode="numeric"
                    value={edicion.dni}
                    onChange={(e) => setEdicion({ ...edicion, dni: e.target.value })}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
                  />
                </div>
              </div>
            )}
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

            <button
              type="submit"
              disabled={enviando}
              className="font-label-md text-label-md inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant"
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
