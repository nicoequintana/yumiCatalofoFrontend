import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usePerfilCliente, { invalidarPerfil } from "../../hooks/usePerfilCliente.js";
import useWhatsapp from "../../hooks/useWhatsapp.js";
import { salirCuenta } from "../../api/cuenta.js";
import { clasePaginaDensa } from "./clasesCuenta.js";

/**
 * Iniciales para el avatar. Recibe el MISMO valor que se pinta como nombre
 * grande — no `perfil.nombre` por su cuenta: si las dos cosas salieran de
 * fuentes distintas, alguien con apodo vería "NQ" al lado de "Tito".
 *
 * El `filter(Boolean)` no es defensa de más: un nombre que queda VACÍO al
 * recortarlo es alcanzable. `cuentaLogin.controller.js` guarda el nombre que
 * manda Google con un check `!== ""` y **sin `trim()`**, así que `" "` entra
 * tal cual; después `!perfil.nombre` con `" "` da `false`, y ese nombre pasa
 * tanto el guard de `RequireAuthCliente` como el `faltaNombre` de
 * `Completar.jsx`. Sin filtrar, `" ".split(/\s+/)` devuelve `[""]` y
 * `undefined.toUpperCase()` tira en render: la pantalla entera en blanco por
 * un espacio. Degrada a un avatar sin letras, que es feo pero se ve.
 */
function iniciales(nombre) {
  return (nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join("");
}

/**
 * El botón destructivo. Es la misma caja que `claseBotonPrimario` con el color
 * del error, y se escribe entero a propósito: derivarlo con un `.replace()`
 * sobre el string de clases es justo la clase de truco que Tailwind no puede
 * ver —el escaneo del contenido no ejecuta JS— y que dejaría el botón sin CSS.
 * Vive acá y no en `clasesCuenta.js` porque es de esta pantalla nada más.
 */
const CLASES_BOTON_SALIR =
  "font-label-md text-label-md min-h-11 rounded-2xl bg-error px-4 py-3.5 text-on-error";

const CLASES_FILA =
  "flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low active:bg-surface-container";

function FilaAcceso({ to, href, icono, titulo, subtitulo, chevron = "chevron_right" }) {
  const contenido = (
    <>
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-brand-teal">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            {icono}
          </span>
        </span>
        <span className="flex flex-col text-left">
          <span className="font-label-lg text-label-lg text-on-surface">{titulo}</span>
          <span className="font-label-md text-label-md text-on-surface-variant">{subtitulo}</span>
        </span>
      </span>
      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-on-surface-variant">
        {chevron}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={CLASES_FILA}>
        {contenido}
        {/* El único aviso de que el link sale del sitio era el ícono
            `open_in_new`, y va en `aria-hidden`. Sin esto, quien usa lector de
            pantalla pierde la pantalla en la que estaba sin enterarse. */}
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
    );
  }
  return (
    <Link to={to} className={CLASES_FILA}>
      {contenido}
    </Link>
  );
}

function MiCuenta() {
  const { perfil } = usePerfilCliente();
  const navigate = useNavigate();
  // Mismo hook que usan `PuertaWhatsApp` y `BotonWhatsapp`: no hay un segundo
  // número que mantener sincronizado. Sin número configurado, `url` es `null`
  // y la fila no se dibuja — falla blanda, igual que el resto del sitio.
  const { url: urlWhatsapp } = useWhatsapp({ tipo: "home" });
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  async function handleCerrarSesion() {
    await salirCuenta();
    // Acá sí corresponde `invalidarPerfil()`: el logout deja la zona
    // guardada, así que el próximo montaje de `RequireAuthCliente` (en la
    // página a la que se navega) es el que dispara el refetch.
    invalidarPerfil();
    navigate("/");
  }

  if (!perfil) return null;

  // UNA sola expresión: de acá salen el nombre grande y las iniciales. Sin
  // tercer nivel: `RequireAuthCliente` ya garantiza que `nombre` existe en
  // esta ruta, así que un `|| perfil.email` sería código muerto tapando un
  // bug del guard en vez de dejarlo ver.
  const nombreVisible = perfil.apodo || perfil.nombre;

  return (
    <div className={clasePaginaDensa}>
      <header className="flex flex-col gap-1">
        <h1 className="font-display-lg text-headline-lg text-on-background">Mi cuenta</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Administrá tu perfil, pedidos y configuración
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
        <div className="flex items-center gap-3.5">
          <span
            data-testid="avatar-iniciales"
            aria-hidden="true"
            className="font-headline-md text-headline-md flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white"
          >
            {iniciales(nombreVisible)}
          </span>
          <h2 data-testid="nombre-visible" className="font-headline-md text-headline-md text-on-surface">
            {nombreVisible}
          </h2>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-dashed border-outline-variant pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-brand-teal">
                mail
              </span>
              <span className="truncate font-body-md text-body-md text-on-surface">{perfil.email}</span>
            </span>
            <Link
              to="/cuenta/email"
              className="font-label-md text-label-md shrink-0 text-primary underline underline-offset-4"
            >
              Cambiar
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-brand-teal">
                call
              </span>
              <span className="truncate font-body-md text-body-md text-on-surface">{perfil.telefono}</span>
            </span>
            <Link
              to="/cuenta/datos"
              className="font-label-md text-label-md shrink-0 text-primary underline underline-offset-4"
            >
              Editar
            </Link>
          </div>
        </div>
      </section>

      <Link
        to="/cuenta/pedidos"
        className="flex items-center justify-between gap-3 rounded-2xl bg-brand-teal p-4 text-white"
      >
        <span className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <span aria-hidden="true" className="material-symbols-outlined">
              inventory_2
            </span>
          </span>
          <span className="flex flex-col text-left">
            <span className="font-label-lg text-label-lg">Mis pedidos</span>
            <span className="font-label-md text-label-md text-white/80">Ver historial</span>
          </span>
        </span>
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          chevron_right
        </span>
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="font-label-md text-label-md px-1 uppercase tracking-wide text-on-surface-variant">
          Configuración
        </h2>
        <div className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <FilaAcceso
            to="/favoritos"
            icono="favorite"
            titulo="Mis favoritos"
            subtitulo="Los productos que guardaste"
          />
          <FilaAcceso
            to="/cuenta/seguridad"
            icono="shield"
            titulo="Seguridad y acceso"
            subtitulo="Contraseña y datos de ingreso"
          />
          {/* Un `null` no renderiza ningún nodo, así que `divide-y` (que separa
              con `> * + *`) no deja ningún borde huérfano cuando falta el
              número: la lista se cierra sola en la fila anterior. */}
          {urlWhatsapp ? (
            <FilaAcceso
              href={urlWhatsapp}
              icono="chat"
              titulo="Ayuda y soporte"
              subtitulo="Escribinos por WhatsApp"
              chevron="open_in_new"
            />
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-3 pt-2">
        {confirmandoSalida ? (
          <>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Vas a cerrar sesión en todos tus dispositivos.
            </p>
            <button
              type="button"
              onClick={handleCerrarSesion}
              className={CLASES_BOTON_SALIR}
            >
              Confirmar cierre de sesión
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoSalida(false)}
              className="font-label-md text-label-md min-h-11 text-on-surface-variant"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoSalida(true)}
            className="font-label-md text-label-md flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-surface-container-lowest px-4 py-3.5 text-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              logout
            </span>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

export default MiCuenta;
