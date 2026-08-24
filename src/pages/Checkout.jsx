import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "../components/BotonVolver.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { getProductsByIds } from "../api/products.js";
import { crearOrden } from "../api/ordenes.js";
import { formatPrecio, precioACentavos } from "../utils/formato.js";

/**
 * `/checkout` — formulario de checkout de invitado (Sprint 6, Task 1).
 *
 * Reconciliación: igual criterio que `Carrito.jsx` (re-fetch acotado a los
 * ids del carrito con `getProductsByIds()`), pero repetida
 * acá porque el usuario pudo haber estado en `/carrito` un rato antes de
 * llegar a `/checkout` — un producto puede haberse agotado o eliminado en el
 * medio. Si el carrito está vacío o TODAS las líneas quedaron inválidas, no
 * hay nada que cobrar: se redirige a `/carrito` (que ya sabe mostrar el aviso
 * puntual por línea y dejar que el usuario la quite).
 *
 * El submit solo envía las líneas válidas (`lineasValidas`) — el backend es
 * la autoridad final igual, pero de esta forma no le mandamos items que ya
 * sabemos que van a ser rechazados.
 */
/**
 * Campos obligatorios, en el orden en que aparecen en el formulario. El orden
 * importa: es el que define a cuál se le devuelve el foco cuando el submit
 * falla, y tiene que ser el primero de la pantalla, no el primero del objeto.
 * Cada clave es además el `id` del input, que es como se lo encuentra.
 */
const CAMPOS_REQUERIDOS = ["dni", "nombre", "telefono", "email"];

/**
 * Chequeo de formato del DNI, solo para dar feedback inmediato y evitar un
 * viaje de ida y vuelta obviamente perdido. NO es la validación real: la
 * autoridad sigue siendo `backend/src/lib/dni.js` (normaliza y exige 7-8
 * dígitos), y su mensaje se muestra igual si alguna vez difieren.
 *
 * Se ignoran los separadores porque el backend también los ignora: quien
 * escribe "12.345.678" no está cometiendo un error, y rechazárselo acá sería
 * más estricto que el servidor.
 */
const DNI_DIGITOS_MIN = 7;
const DNI_DIGITOS_MAX = 8;

/**
 * Tope de caracteres del input de DNI: los 8 dígitos máximos más los dos
 * puntos de "12.345.678". Cortar en 8 truncaría en silencio a quien escribe
 * con separadores.
 */
const DNI_LARGO_MAX = 10;

function dniTieneFormatoPlausible(valor) {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= DNI_DIGITOS_MIN && digitos.length <= DNI_DIGITOS_MAX;
}

/**
 * Chequeo de formato del email, del mismo tenor que el del DNI: feedback
 * inmediato, no la validación real. La autoridad es
 * `backend/src/lib/emailValido.js`, y usa esta misma forma (`algo@algo.algo`).
 */
const FORMATO_EMAIL = /^\S+@\S+\.\S+$/;

function emailTieneFormatoPlausible(valor) {
  return FORMATO_EMAIL.test(valor.trim());
}

function Checkout() {
  const navigate = useNavigate();
  const { carrito } = useCarrito();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");

  const [erroresCampos, setErroresCampos] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Misma clave de refetch que `Carrito.jsx`: los ids del carrito, sin las
  // cantidades. Antes esta pantalla se bajaba el catálogo completo para
  // cotizar las pocas líneas del pedido.
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
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [claveIds]);

  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  const lineas = carrito.map((linea) => {
    const producto = productosPorId.get(linea.productId);
    const noDisponible = !producto;
    return { ...linea, producto, noDisponible };
  });

  const lineasValidas = lineas.filter((l) => !l.noDisponible);
  const hayProblemas = lineas.some((l) => l.noDisponible);

  // Total del pedido, con los precios FRESCOS de la reconciliación (los
  // mismos que el backend va a snapshotear en la orden). Se acumula en
  // centavos enteros — ver `precioACentavos` — igual que en `Carrito.jsx`:
  // sumar floats decimales linea a linea acumula drift de punto flotante.
  // Solo cuenta las líneas válidas, que son exactamente las que se envían.
  const totalCentavos = lineasValidas.reduce(
    (total, l) => total + precioACentavos(l.producto.precio) * l.cantidad,
    0,
  );
  const total = formatPrecio(totalCentavos / 100);

  // Redirige a /carrito si no hay nada que checkear: carrito vacío, o todas
  // las líneas quedaron no-disponibles tras la reconciliación en vivo. Se
  // espera a que termine el fetch (`cargando`) para no redirigir de más
  // mientras `productos` todavía está vacío por estar cargando (eso haría
  // que TODAS las líneas parezcan "no disponibles" un instante).
  // Si el fetch falló no hay reconciliación posible: `productos` está vacío
  // por la falla, no porque el carrito lo esté, así que redirigir sería
  // mandar al usuario a otra pantalla que muestra el mismo error.
  useEffect(() => {
    if (cargando || errorCarga) return;
    if (lineasValidas.length === 0) {
      navigate("/carrito", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, errorCarga, lineasValidas.length, navigate]);

  function validarCampos() {
    const errores = {};
    if (!dni.trim()) {
      errores.dni = "El DNI es obligatorio.";
    } else if (!dniTieneFormatoPlausible(dni)) {
      errores.dni = "El DNI debe tener 7 u 8 dígitos.";
    }
    if (!nombre.trim()) errores.nombre = "El nombre es obligatorio.";
    if (!telefono.trim()) errores.telefono = "El teléfono es obligatorio.";
    if (!email.trim()) {
      errores.email = "El email es obligatorio.";
    } else if (!emailTieneFormatoPlausible(email)) {
      errores.email = "El email no tiene un formato válido.";
    }
    setErroresCampos(errores);
    return Object.keys(errores).length === 0;
  }

  // Mueve el foco al primer campo inválido cuando el submit falla. Sin esto el
  // foco se queda en el botón: los mensajes de error aparecen abajo de cada
  // campo, fuera de la vista y sin anunciarse, y el usuario solo percibe que el
  // botón "no hizo nada".
  //
  // Va en un efecto y no dentro de `validarCampos` a propósito: enfocar en el
  // mismo tick dejaría al input todavía sin `aria-invalid` ni el
  // `aria-describedby` que apunta al mensaje, que es justamente lo que el lector
  // de pantalla lee al recibir el foco. `erroresCampos` es un objeto nuevo en
  // cada validación, así que un segundo submit fallido vuelve a enfocar.
  useEffect(() => {
    const primerInvalido = CAMPOS_REQUERIDOS.find((campo) => erroresCampos[campo]);
    if (primerInvalido === undefined) return;
    document.getElementById(primerInvalido)?.focus();
  }, [erroresCampos]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorEnvio(null);

    if (!validarCampos()) return;
    if (lineasValidas.length === 0) return;

    setEnviando(true);
    try {
      const orden = await crearOrden({
        dni: dni.trim(),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        notas: notas.trim() || undefined,
        items: lineasValidas.map((l) => ({ productId: l.productId, cantidad: l.cantidad })),
      });

      // El carrito se vacía recién en OrdenConfirmada.jsx al montar, no acá:
      // si la navegación se interrumpe (el usuario cierra la pestaña, se
      // corta la conexión) el carrito no se pierde y puede reintentar.
      navigate("/checkout/confirmacion", { state: { orden } });
    } catch (err) {
      setErrorEnvio(err.message);
      setEnviando(false);
    }
  }

  if (cargando) {
    return <EstadoVacio icono="hourglass_empty" mensaje="Cargando checkout…" />;
  }

  if (errorCarga) {
    return (
      <EstadoVacio icono="cloud_off" titulo="No pudimos cargar tu pedido" mensaje={errorCarga} />
    );
  }

  // Mientras el efecto de redirección todavía no corrió (mismo render en el
  // que `lineasValidas` quedó en 0), no renderizar el formulario.
  if (lineasValidas.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="mb-6">
        <BotonVolver fallback="/carrito" />
      </div>

      <div className="mb-16 flex flex-col items-center">
        <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
          Un paso más
        </span>
        <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">
          Checkout
        </h2>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {hayProblemas ? (
          <p className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
            Algunos productos de tu carrito ya no están disponibles y no se van a incluir en el
            pedido. Podés revisarlos en el carrito.
          </p>
        ) : null}

        {/* Resumen con montos: es el último paso donde todavía se puede
            desistir, así que el usuario tiene que ver cuánto va a pagar ANTES
            de confirmar — no recién en la pantalla de confirmación, con la
            orden ya creada. Los precios son los frescos del re-fetch, los
            mismos que el backend snapshotea al crear la orden. */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <ul className="flex flex-col gap-3">
            {lineasValidas.map((l) => (
              <li key={l.productId} className="flex items-center justify-between gap-4">
                <span className="font-body-md text-body-md text-on-surface">
                  {l.cantidad} × {l.producto.nombre}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="font-body-md text-body-md text-on-surface">
                    {formatPrecio((precioACentavos(l.producto.precio) * l.cantidad) / 100)}
                  </span>
                  <span className="font-body-md text-[13px] text-on-surface-variant">
                    {formatPrecio(l.producto.precio)} c/u
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="dni" className="font-label-md text-label-md text-on-surface">
              DNI
            </label>
            {/* `inputMode="numeric"` abre el teclado numérico en el celular:
                un DNI son dígitos, y el QWERTY completo es fricción pura en
                el formulario que más importa de la app. Sigue siendo
                `type="text"` porque `type="number"` agrega flechas de spinner
                y descarta los separadores que el backend sí acepta. */}
            <input
              id="dni"
              type="text"
              inputMode="numeric"
              maxLength={DNI_LARGO_MAX}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              aria-invalid={Boolean(erroresCampos.dni)}
              aria-describedby={erroresCampos.dni ? "dni-error" : undefined}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
            />
            {erroresCampos.dni ? (
              <p id="dni-error" className="font-body-md text-body-md text-error">
                {erroresCampos.dni}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nombre" className="font-label-md text-label-md text-on-surface">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              aria-invalid={Boolean(erroresCampos.nombre)}
              aria-describedby={erroresCampos.nombre ? "nombre-error" : undefined}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
            />
            {erroresCampos.nombre ? (
              <p id="nombre-error" className="font-body-md text-body-md text-error">
                {erroresCampos.nombre}
              </p>
            ) : null}
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
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              aria-invalid={Boolean(erroresCampos.telefono)}
              aria-describedby={erroresCampos.telefono ? "telefono-error" : undefined}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
            />
            {erroresCampos.telefono ? (
              <p id="telefono-error" className="font-body-md text-body-md text-error">
                {erroresCampos.telefono}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-label-md text-label-md text-on-surface">
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(erroresCampos.email)}
              aria-describedby={erroresCampos.email ? "email-error" : "email-ayuda"}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface"
            />
            {erroresCampos.email ? (
              <p id="email-error" className="font-body-md text-body-md text-error">
                {erroresCampos.email}
              </p>
            ) : (
              <p id="email-ayuda" className="font-body-md text-body-md text-on-surface-variant">
                Te enviamos ahí la confirmación del pedido y los cambios de estado.
              </p>
            )}
          </div>

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
              {errorEnvio}
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
  );
}

export default Checkout;
