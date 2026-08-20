import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth.js";
import { setToken } from "../../api/authClient.js";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { token } = await login(email, password);
      setToken(token);
      navigate("/catalogo/admin/productos");
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
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
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
