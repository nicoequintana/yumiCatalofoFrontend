import { useEffect, useRef, useState } from "react";

const SRC_GIS = "https://accounts.google.com/gsi/client";
const TIMEOUT_MS = 5000;

/**
 * Cache module-level de la carga del script: dos instancias de `BotonGmail`
 * montadas en la misma carga de página (improbable, pero gratis de cubrir)
 * no piden el script dos veces.
 */
let promesaScript = null;

function cargarScriptGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (promesaScript) return promesaScript;

  promesaScript = new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${SRC_GIS}"]`);
    if (existente) {
      existente.addEventListener("load", () => resolve(), { once: true });
      existente.addEventListener("error", () => reject(new Error("GIS no cargó")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SRC_GIS;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("GIS no cargó")), { once: true });
    document.head.appendChild(script);
  })
    // Al asentarse, se libera la caché: una vez cargado, `window.google` ya
    // responde el chequeo de arriba, así que esto no dispara un segundo
    // pedido de red en producción. Sin liberarla, un montaje posterior en el
    // mismo documento reusaría la promesa resuelta aunque `window.google` ya
    // no exista (por ejemplo, entre tests de este archivo).
    .finally(() => {
      promesaScript = null;
    });

  return promesaScript;
}

/**
 * Botón "Iniciar sesión con Gmail" — en realidad el `<div>` donde Google
 * Identity Services dibuja SU propio botón (`renderButton`): no hay forma de
 * personalizar su texto interno, por eso `Entrar.jsx` (Task 8) pone la
 * etiqueta "Iniciar sesión con Gmail" AL LADO, no adentro.
 *
 * `ux_mode: "popup"` SIEMPRE — nunca `"redirect"` (Global Constraints): un
 * redirect abandonaría el carrito en memoria de la pestaña.
 *
 * Sin `VITE_GOOGLE_CLIENT_ID` (build sin la variable) o si `window.google`
 * no aparece en `TIMEOUT_MS`, renderiza `null` y llama a `onNoDisponible()`
 * — el formulario local sigue disponible, nunca hay redirect de reserva.
 */
function BotonGmail({ onCredential, onNoDisponible }) {
  const contenedorRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [disponible, setDisponible] = useState(Boolean(clientId));

  useEffect(() => {
    // Un build SIN la variable es el modo de falla mas probable de los dos, y
    // era el unico que salia en silencio: el componente renderizaba `null` sin
    // avisar, y quien lo envuelve con un rotulo se quedaba con el rotulo solo,
    // señalando un boton que no existe. El aviso va en un efecto, no en el
    // render, porque el padre reacciona con un `setState`.
    if (!clientId) {
      onNoDisponible?.();
      return;
    }

    let activo = true;
    const timer = setTimeout(() => {
      if (!activo) return;
      setDisponible(false);
      onNoDisponible?.();
    }, TIMEOUT_MS);

    cargarScriptGis()
      .then(() => {
        clearTimeout(timer);
        if (!activo || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (respuesta) => onCredential?.(respuesta.credential),
          ux_mode: "popup",
        });

        if (contenedorRef.current) {
          // Google dibuja SU botón dentro de un iframe: no se puede restilar
          // por CSS. Estos son los únicos parámetros que la API expone
          // (`GsiButtonConfiguration`), y son lo más cerca que se llega del
          // pill de ancho completo del diseño. `width` se MIDE del contenedor:
          // un valor fijo (era 384) se salía de la tarjeta en pantallas más
          // angostas. GIS acepta entre 200 y 400px.
          const ancho = Math.min(400, Math.max(200, contenedorRef.current.clientWidth));
          window.google.accounts.id.renderButton(contenedorRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            logo_alignment: "center",
            text: "signin_with",
            width: String(ancho),
            locale: "es",
          });
        }
      })
      .catch(() => {
        clearTimeout(timer);
        if (!activo) return;
        setDisponible(false);
        onNoDisponible?.();
      });

    return () => {
      activo = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId || !disponible) return null;

  // `w-full` + `flex justify-center`: el div mide el ancho disponible (de ahí
  // sale `width`) y, cuando la tarjeta pasa de 400px, el botón queda centrado.
  return <div ref={contenedorRef} className="flex w-full justify-center" />;
}

export default BotonGmail;
