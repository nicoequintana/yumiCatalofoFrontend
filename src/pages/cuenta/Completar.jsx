import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import usePerfilCliente, { refrescarPerfil } from "../../hooks/usePerfilCliente.js";
import { actualizarPerfil } from "../../api/cuenta.js";

const DESTINO_POR_DEFECTO = "/cuenta";

function destinoValido(volverA) {
  if (typeof volverA !== "string") return DESTINO_POR_DEFECTO;
  if (!volverA.startsWith("/") || volverA.startsWith("//")) return DESTINO_POR_DEFECTO;
  return volverA;
}

/**
 * `/cuenta/completar` — pide SOLO los campos que faltan (`RequireAuthCliente`
 * ya decidió que faltaba al menos uno antes de mandar acá). Una cuenta de
 * Google llega sin `nombre`/`telefono`/`dni`; el guard del checkout
 * (`Cliente.nombre` es `NOT NULL` en el backend) es lo que exige esto ANTES
 * de armar una orden.
 *
 * Al guardar usa `refrescarPerfil()`, NUNCA `invalidarPerfil()`: el destino
 * (`volverA`, o `/cuenta` por defecto) sigue DENTRO de `RequireAuthCliente`
 * — `/checkout`, `/cuenta` y `/cuenta/pedidos*` están las tres guardadas.
 * `invalidarPerfil()` solo limpia el cache y espera un MONTAJE futuro del
 * guard para recargar, pero el guard ya está montado en esta navegación (es
 * un layout, no remonta entre rutas hijas): quedaría con `resuelto:false`
 * para siempre y el spinner girando sin nada que lo saque de ahí.
 */
function Completar() {
  const { perfil, resuelto } = usePerfilCliente();
  const location = useLocation();
  const navigate = useNavigate();
  const volverA = destinoValido(new URLSearchParams(location.search).get("volverA"));

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    setNombre(perfil.nombre ?? "");
    setTelefono(perfil.telefono ?? "");
    setDni(perfil.dni ?? "");
  }, [perfil]);

  if (!resuelto || !perfil) return null;

  const faltaNombre = !perfil.nombre;
  const faltaTelefono = !perfil.telefono;
  const faltaDni = !perfil.dni;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await actualizarPerfil({
        nombre: faltaNombre ? nombre : undefined,
        telefono: faltaTelefono ? telefono : undefined,
        dni: faltaDni ? dni : undefined,
      });
      refrescarPerfil();
      navigate(volverA);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Completá tus datos</h1>
      <p className="text-body-md text-on-surface-variant">
        Necesitamos estos datos para poder armar tu pedido.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {faltaNombre ? (
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Nombre</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
            />
          </label>
        ) : null}
        {faltaTelefono ? (
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Teléfono</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
            />
          </label>
        ) : null}
        {faltaDni ? (
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">DNI</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
            />
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="text-body-md text-error">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={cargando}
          className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
        >
          {cargando ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}

export default Completar;
