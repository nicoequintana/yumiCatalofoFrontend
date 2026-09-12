import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmarEmail } from "../../api/cuenta.js";
import { invalidarPerfil } from "../../hooks/usePerfilCliente.js";

/**
 * `/cuenta/email/confirmar`. Cierra el cambio de email que se pidió desde
 * `/cuenta/email`: hasta acá la cuenta sigue entrando con el correo viejo.
 *
 * El POST se dispara SOLO al tocar el botón —nunca al montar—, por el mismo
 * motivo que `Verificar.jsx`: un `useEffect` que confirma solo es justo lo que
 * Outlook Safe Links y los antivirus prefetchean, y consumen el token antes de
 * que la persona llegue a abrir el mail.
 *
 * A diferencia de `Verificar.jsx`, acá no hace falta la Puerta de WhatsApp: con
 * el link roto la cuenta sigue siendo usable con el email anterior, así que la
 * salida es entrar y volver a pedir el cambio, no escribirle a alguien.
 *
 * El 409 es propio de esta pantalla: entre el pedido y la confirmación otra
 * cuenta pudo tomar ese email. Se distingue del link inválido porque la acción
 * que sigue es otra —elegir otro correo, no volver a copiar el link—.
 */
function ConfirmarEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  // inicial | cargando | ok | usado | vencido | conflicto | error
  const [estado, setEstado] = useState("inicial");

  async function handleConfirmar() {
    setEstado("cargando");
    try {
      await confirmarEmail(token);
      // El perfil en memoria todavía tiene el email viejo: sin invalidarlo,
      // "Mi cuenta" mostraría el anterior hasta el próximo refetch.
      invalidarPerfil();
      setEstado("ok");
    } catch (err) {
      if (err.motivo === "USADO") setEstado("usado");
      else if (err.motivo === "VENCIDO") setEstado("vencido");
      else if (err.status === 409) setEstado("conflicto");
      else setEstado("error");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg text-on-background">Falta el link</h1>
        <p className="text-body-md text-on-surface-variant">
          Este link de confirmación está incompleto. Volvé a copiarlo del mail.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Confirmar nuevo email</h1>

      {estado === "inicial" || estado === "cargando" ? (
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={estado === "cargando"}
          className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
        >
          {estado === "cargando" ? "Confirmando..." : "Confirmar email"}
        </button>
      ) : null}

      {estado === "ok" ? (
        <>
          <p className="text-body-md text-on-surface">Tu email se actualizó.</p>
          <Link to="/cuenta" className="text-body-md text-primary underline">
            Ir a Mi cuenta
          </Link>
        </>
      ) : null}

      {estado === "usado" ? (
        <p role="alert" className="text-body-md text-error">
          Este link ya se usó.
        </p>
      ) : null}
      {estado === "vencido" ? (
        <p role="alert" className="text-body-md text-error">
          Este link venció.
        </p>
      ) : null}
      {estado === "conflicto" ? (
        <p role="alert" className="text-body-md text-error">
          Ese email ya está en uso por otra cuenta.
        </p>
      ) : null}
      {estado === "error" ? (
        <p role="alert" className="text-body-md text-error">
          Este link no es válido.
        </p>
      ) : null}
    </div>
  );
}

export default ConfirmarEmail;
