import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CampoPassword from "../../components/CampoPassword.jsx";
import { login } from "../../api/auth.js";
import { setToken } from "../../api/authClient.js";

const DESTINO_POR_DEFECTO = "/catalogo/admin/productos";

/**
 * Valida el `?volverA=` que deja `authClient.js` al redirigir por un 401.
 *
 * Solo se obedece una ruta INTERNA del panel admin. Cualquier otra cosa cae
 * al default: una URL absoluta ("https://evil.com") o protocol-relative
 * ("//evil.com") convertiría el login en un open redirect, y una ruta interna
 * fuera del admin no es un destino que un 401 del panel pueda haber generado.
 * El prefijo se exige exacto o seguido de "/" o "?" para que
 * "/catalogo/adminx" no pase por parecido.
 */
function destinoTrasLogin(volverA) {
  if (typeof volverA !== "string") return DESTINO_POR_DEFECTO;
  const esRutaAdmin =
    volverA === "/catalogo/admin" ||
    volverA.startsWith("/catalogo/admin/") ||
    volverA.startsWith("/catalogo/admin?");
  return esRutaAdmin ? volverA : DESTINO_POR_DEFECTO;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { token } = await login(email, password);
      setToken(token);
      navigate(destinoTrasLogin(searchParams.get("volverA")));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Acceso admin</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Email</span>
          {/* `autoComplete` explícito para que los gestores de contraseñas
              reconozcan el par usuario/clave y ofrezcan la credencial
              guardada. Sin estos tokens muchos ni siquiera detectan el
              formulario como un login. */}
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
        {/* `current-password` y no `new-password`: acá se ingresa una que ya
            existe, así que el gestor SÍ tiene que ofrecer la guardada. Es la
            decisión opuesta a la del alta de usuarios, y por eso el componente
            no tiene un default para este campo. */}
        <CampoPassword
          value={password}
          onChange={setPassword}
          etiqueta="Contraseña"
          etiquetaVisible
          etiquetaClassName="text-label-md text-on-surface-variant mb-1 block"
          autoComplete="current-password"
          required
          // Conserva el estilo compacto de esta tarjeta, más chico que el del
          // resto del panel. `pr-12` lo agrega el componente igual: es el hueco
          // del ojito, no apariencia.
          className="rounded border border-outline-variant bg-surface-container-lowest py-2 pl-3 text-body-md text-on-surface"
        />
        {/*
          `role="alert"` para que el fallo de login se anuncie solo: el foco se
          queda en el botón "Ingresar" después del submit, así que sin esto el
          único aviso de que las credenciales están mal es visual.
        */}
        {error && (
          <p role="alert" className="text-body-md text-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={cargando}
          className="rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;
