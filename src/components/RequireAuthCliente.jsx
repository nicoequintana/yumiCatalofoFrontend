import { Navigate, Outlet, useLocation } from "react-router-dom";
import EstadoVacio from "./EstadoVacio.jsx";
import PuertaWhatsApp from "./PuertaWhatsApp.jsx";
import Spinner from "./Spinner.jsx";
import usePerfilCliente, { refrescarPerfil } from "../hooks/usePerfilCliente.js";

const RUTA_ENTRAR = "/cuenta/entrar";
const RUTA_COMPLETAR = "/cuenta/completar";

/**
 * Guard de las rutas de cliente que exigen sesión — `/cuenta`,
 * `/cuenta/completar`, `/cuenta/pedidos*` y el checkout autenticado.
 *
 * A diferencia de `RequireAuth.jsx` (el del ADMIN, que es otro sistema) acá no
 * hay token que inspeccionar: la sesión viaja en una cookie `httpOnly` y la
 * única autoridad sobre "¿hay sesión?" es `GET /api/cuenta`, vía
 * `usePerfilCliente`.
 *
 * ⚠️ **El orden de las ramas es lo único que hace correcto a este componente.**
 * `usePerfilCliente` devuelve `perfil: null` con `resuelto: true` en DOS
 * situaciones distintas: el visitante anónimo (401, se SABE que no hay sesión)
 * y la verificación fallida (503, red caída o timeout: NO se sabe nada). Lo
 * único que las separa es `error`. Si se preguntara `!perfil` antes que
 * `error`, a alguien con una sesión perfectamente válida cuyo `GET /api/cuenta`
 * se cayó lo mandaríamos al login — donde volver a iniciar sesión no le arregla
 * nada, porque su sesión nunca estuvo rota. Es la regla del proyecto "fallar la
 * carga nunca es lo mismo que no haber nada", en su versión más cara.
 *
 * Las cuatro ramas, en este orden:
 * 1. `!resuelto` → spinner, sin navegar. Va PRIMERO también porque durante un
 *    `refrescarPerfil()` en vuelo el hook conserva el `perfil` y el `error`
 *    viejos y solo baja `resuelto`: pintar cualquiera de los dos sin mirar
 *    `resuelto` mostraría datos rancios.
 * 2. `error` → pantalla de error con "Reintentar", nunca el login.
 * 3. `!perfil` → anónimo de verdad: a `/cuenta/entrar?volverA=...`.
 * 4. Falta `nombre`, `telefono` o `dni` → a `/cuenta/completar?volverA=...`,
 *    salvo que ya esté parado ahí (si no, esa pantalla se redirigiría a sí
 *    misma para siempre). `Cliente.nombre` es NOT NULL: sin este chequeo el
 *    `$transaction` del checkout explota.
 */
function RequireAuthCliente() {
  const { perfil, resuelto, error } = usePerfilCliente();
  const location = useLocation();

  // `pathname + search`, no solo el pathname: sin el query string, volver de
  // login deja a la persona en la página 1 de un listado que estaba mirando en
  // la 3 — una redirección que pierde a dónde iba es un bug, no un detalle.
  const rutaActual = `${location.pathname}${location.search}`;
  const volverA = `?volverA=${encodeURIComponent(rutaActual)}`;

  if (!resuelto) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center text-on-surface-variant">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full flex-col items-center pb-24">
        {/*
          El texto es NUESTRO, no el de `error`: el hook echa `cuerpo?.error`
          cuando el backend manda uno, y esa cadena está escrita para un log,
          no para alguien que quiere comprar. `error` acá vale como booleano.
          `EstadoVacio` no acepta children, así que las acciones van AL LADO.
        */}
        <EstadoVacio
          icono="cloud_off"
          titulo="No pudimos verificar tu sesión"
          mensaje="Revisá tu conexión e intentá de nuevo."
        />
        {/*
          `-mt-12` porque `EstadoVacio` trae su propio `py-24`: sin esto las
          acciones quedan a media pantalla del mensaje que las explica.
        */}
        <div className="-mt-12 flex flex-col items-center gap-4">
          <button
            type="button"
            // `refrescarPerfil`, NUNCA `invalidarPerfil`: este último solo
            // notifica el estado vacío y espera un MONTAJE futuro para
            // recargar, y el guard ya está montado — la pantalla se quedaría
            // con el spinner girando para siempre.
            onClick={() => refrescarPerfil()}
            className="font-label-lg text-label-lg inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 py-3 uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
          >
            Reintentar
          </button>
          {/*
            "El principio de la puerta" (spec): toda pantalla de bloqueo ofrece
            el canal de WhatsApp. Si el reintento tampoco anda, la persona
            todavía tiene una forma humana de comprar.
          */}
          <PuertaWhatsApp />
        </div>
      </div>
    );
  }

  if (!perfil) {
    return <Navigate to={`${RUTA_ENTRAR}${volverA}`} replace />;
  }

  const perfilIncompleto = !perfil.nombre || !perfil.telefono || !perfil.dni;
  // `replace` en las dos redirecciones: con `push`, el "atrás" del navegador
  // devuelve a la ruta protegida, el guard vuelve a patear y la persona queda
  // presa en un ping-pong del que no sale.
  if (perfilIncompleto && location.pathname !== RUTA_COMPLETAR) {
    return <Navigate to={`${RUTA_COMPLETAR}${volverA}`} replace />;
  }

  return <Outlet />;
}

export default RequireAuthCliente;
