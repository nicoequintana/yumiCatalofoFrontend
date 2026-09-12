import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BotonVolver from "../../components/BotonVolver.jsx";
import CampoPassword from "../../components/CampoPassword.jsx";
import BotonGmail from "../../components/BotonGmail.jsx";
import PuertaWhatsApp from "../../components/PuertaWhatsApp.jsx";
import useCarrito, { storageDisponible } from "../../hooks/useCarrito.js";
import { invalidarPerfil } from "../../hooks/usePerfilCliente.js";
import { loginCuenta, loginGoogle } from "../../api/cuenta.js";
import {
  claseBotonPrimario,
  claseCampoConIcono,
  claseCampoPassword,
  claseEtiqueta,
  claseEtiquetaSuelta,
  clasePagina,
  claseTarjetaEscritorio,
} from "./clasesCuenta.js";

const DESTINO_POR_DEFECTO = "/cuenta";
const FALLOS_ANTES_DE_PUERTA = 3;

/**
 * Mismo criterio de open-redirect que `destinoTrasLogin` en `AdminLogin.jsx`:
 * solo se obedece una ruta INTERNA — empieza con "/" y no con "//" (que el
 * navegador trata como protocol-relative a otro host).
 */
function destinoValido(volverA) {
  if (typeof volverA !== "string") return DESTINO_POR_DEFECTO;
  if (!volverA.startsWith("/") || volverA.startsWith("//")) return DESTINO_POR_DEFECTO;
  return volverA;
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fallosSeguidos, setFallosSeguidos] = useState(0);
  const [cargando, setCargando] = useState(false);
  // `BotonGmail` devuelve null y avisa por acá cuando falta VITE_GOOGLE_CLIENT_ID
  // o el script de Google no carga a tiempo. Sin escuchar el aviso, el rótulo
  // y el separador quedaban señalando un botón que no existe.
  const [googleDisponible, setGoogleDisponible] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { carrito } = useCarrito();
  const volverA = destinoValido(searchParams.get("volverA"));

  function irADestino() {
    invalidarPerfil();
    navigate(volverA);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await loginCuenta({ email, password });
      if (respuesta?.requiereCodigo) {
        navigate("/cuenta/entrar/codigo", { state: { email, volverA } });
        return;
      }
      setFallosSeguidos(0);
      irADestino();
    } catch (err) {
      if (err.status === 401) setFallosSeguidos((n) => n + 1);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCredencialGoogle(credential) {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await loginGoogle(credential);
      invalidarPerfil();
      navigate(
        respuesta?.completar ? `/cuenta/completar?volverA=${encodeURIComponent(volverA)}` : volverA,
      );
    } catch (err) {
      if (err.codigo === "SOLO_GMAIL") {
        setError(
          "Con una cuenta de Google del trabajo no podemos continuar. Registrate con el formulario.",
        );
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }

  const mostrarPuerta = fallosSeguidos >= FALLOS_ANTES_DE_PUERTA;
  const avisoStorage = !storageDisponible() && carrito.length > 0;

  return (
    <div className={clasePagina}>
      {/* Solo en escritorio: en mobile el formulario ya va directo sobre el
          fondo y no necesita un "volver" propio acá. */}
      <div data-testid="volver-tienda-escritorio" className="hidden lg:block">
        <BotonVolver fallback="/" etiqueta="Volver a la tienda" />
      </div>

      <div data-testid="tarjeta-entrar" className={claseTarjetaEscritorio}>
        {/* Ícono decorativo, solo en escritorio: la tarjeta lo pide, la
            versión mobile (sin tarjeta) no lo necesita. */}
        <span
          aria-hidden="true"
          className="mx-auto hidden h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-white lg:flex"
        >
          <span className="material-symbols-outlined">person</span>
        </span>

        <header className="flex flex-col gap-1.5 lg:text-center">
          <h1 className="font-display-lg text-headline-lg text-on-background">Iniciá sesión</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ingresá a tu cuenta para continuar con tus compras y pedidos.
          </p>
        </header>

        {avisoStorage ? (
          <p className="font-body-md text-body-md rounded-lg bg-error-container px-4 py-3 text-on-error-container">
            Tu navegador está bloqueando el guardado. Si iniciás sesión ahora podés perder el
            carrito.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="entrar-email"
              className={claseEtiqueta}
            >
              Email
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
              >
                mail
              </span>
              <input
                id="entrar-email"
                type="email"
                autoComplete="username"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={claseCampoConIcono}
              />
            </div>
          </div>

          {/* El link se POSICIONA sobre la línea de la etiqueta en escritorio;
              no se toca cómo `CampoPassword` arma su `<label>` (genera el
              `id` con `useId()` y no lo expone, así que un `htmlFor` propio
              acá no tendría a qué apuntar). El contenedor relativo envuelve
              los dos, y el link va absoluto solo desde `lg`. */}
          <div className="relative flex flex-col gap-4">
            <CampoPassword
              value={password}
              onChange={setPassword}
              etiqueta="Contraseña"
              etiquetaVisible
              etiquetaClassName={claseEtiquetaSuelta}
              autoComplete="current-password"
              required
              icono="lock"
              className={claseCampoPassword}
            />

            {/* Mobile: bloque propio debajo del campo, alineado a la derecha
                — igual que hoy. Escritorio: mismo nodo, pero absoluto en la
                esquina superior derecha del contenedor, a la altura de la
                etiqueta CONTRASEÑA. El DOM no se mueve entre los dos casos. */}
            <Link
              to="/cuenta/olvide"
              className="block text-right font-label-md text-label-md text-on-surface-variant underline underline-offset-4 hover:text-primary lg:absolute lg:right-0 lg:top-0"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error ? (
            <p role="alert" className="font-body-md text-body-md text-error">
              {error}
            </p>
          ) : null}

          {mostrarPuerta ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-4">
              <p className="font-body-md text-body-md text-on-surface">
                Si olvidaste tu contraseña, podés recuperarla.
              </p>
              <PuertaWhatsApp />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={cargando}
            className={claseBotonPrimario}
          >
            {cargando ? (
              "Ingresando..."
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                Iniciar sesión
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  arrow_forward
                </span>
              </span>
            )}
          </button>
        </form>

        {/* Debajo del formulario y detrás de un separador: entrar con email es
            la vía principal, Google es la alternativa. El bloque entero
            —separador y botón— desaparece si Google no se puede dibujar. */}
        {googleDisponible ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3" role="separator" aria-label="o continuar con">
              <span className="h-px flex-1 bg-outline-variant" />
              <span
                aria-hidden="true"
                className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant"
              >
                O continuar con
              </span>
              <span className="h-px flex-1 bg-outline-variant" />
            </div>
            <BotonGmail
              onCredential={handleCredencialGoogle}
              onNoDisponible={() => setGoogleDisponible(false)}
            />
          </div>
        ) : null}

        <p className="font-body-md text-body-md text-center text-on-surface-variant">
          ¿No tenés cuenta?{" "}
          <Link to="/cuenta/registro" className="font-semibold text-primary underline underline-offset-4">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Entrar;
