import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PuertaWhatsApp from "../../components/PuertaWhatsApp.jsx";
import { verificarCuenta } from "../../api/cuenta.js";

/**
 * `/cuenta/verificar`. El POST se dispara SOLO al tocar el botón —nunca al
 * montar—: un link de mail que confirma solo (un `useEffect` disparando el
 * POST al montar) es exactamente lo que Outlook Safe Links y los antivirus
 * prefetchean, consumiendo el token antes de que la persona lo abra.
 *
 * El caso VENCIDO no puede reenviar de verdad: `POST /reenviar-verificacion`
 * necesita `{email}` y esta pantalla solo tiene el token de la URL — el
 * backend deliberadamente no delata a quién pertenece un token ajeno en el
 * 400. El botón "Reenviar" guía a `/cuenta/registro` en su lugar.
 */
function Verificar() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  // inicial | cargando | ok | usado | vencido | vencido-guia | error
  const [estado, setEstado] = useState("inicial");

  async function handleConfirmar() {
    setEstado("cargando");
    try {
      await verificarCuenta(token);
      setEstado("ok");
    } catch (err) {
      if (err.motivo === "USADO") setEstado("usado");
      else if (err.motivo === "VENCIDO") setEstado("vencido");
      else setEstado("error");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg text-on-background">Falta el link</h1>
        <p className="text-body-md text-on-surface-variant">
          Este link de verificación está incompleto. Volvé a copiarlo del mail.
        </p>
        <PuertaWhatsApp />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Confirmá tu cuenta</h1>

      {estado === "inicial" || estado === "cargando" ? (
        <>
          <p className="text-body-md text-on-surface-variant">
            Tocá el botón para confirmar tu cuenta.
          </p>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={estado === "cargando"}
            className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
          >
            {estado === "cargando" ? "Confirmando..." : "Confirmar mi cuenta"}
          </button>
        </>
      ) : null}

      {estado === "ok" ? (
        <>
          <p className="text-body-md text-on-surface">Tu cuenta está lista.</p>
          <Link to="/cuenta/entrar" className="text-body-md text-primary underline">
            Entrá
          </Link>
        </>
      ) : null}

      {estado === "usado" ? (
        <p role="alert" className="text-body-md text-error">
          Este link ya se usó.
        </p>
      ) : null}

      {estado === "vencido" || estado === "vencido-guia" ? (
        <>
          <p role="alert" className="text-body-md text-error">
            Este link venció.
          </p>
          {estado === "vencido" ? (
            <button
              type="button"
              onClick={() => setEstado("vencido-guia")}
              className="min-h-11 rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface"
            >
              Reenviar
            </button>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              Registrate de nuevo con tu email para recibir un link nuevo.
            </p>
          )}
          <PuertaWhatsApp />
        </>
      ) : null}

      {estado === "error" ? (
        <p role="alert" className="text-body-md text-error">
          Este link no es válido.
        </p>
      ) : null}
    </div>
  );
}

export default Verificar;
