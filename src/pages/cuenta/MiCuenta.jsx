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
  "font-label-lg text-label-lg min-h-11 rounded-2xl bg-error px-4 py-3.5 text-on-error";

/**
 * Fila de acceso. En escritorio deja de ser una fila de una lista dividida y
 * pasa a ser su propia tarjeta: `Un solo componente, dos formas` — no hay una
 * segunda versión de este componente para `lg`, las clases de tarjeta se
 * agregan encima de las mismas de siempre.
 */
const CLASES_FILA =
  "flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low active:bg-surface-container lg:rounded-2xl lg:border lg:border-outline-variant lg:bg-surface-container-lowest lg:p-5";

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

/**
 * Fila de contacto (email / teléfono), como sub-tarjeta: ícono a la
 * izquierda, rótulo en mayúsculas arriba del valor, acción a la derecha
 * centrada verticalmente. Es UN componente porque email y teléfono difieren
 * solo en ícono, rótulo, valor y destino — repetir el markup sería la cuarta
 * copia del mismo bloque que ya pasó una vez con los campos de formulario
 * (ver el comentario de `clasesCuenta.js`).
 */
function FilaContacto({ icono, rotulo, valor, to, etiquetaAccion }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-brand-teal">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          {icono}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
          {rotulo}
        </span>
        <span className="truncate font-body-md text-body-md text-on-surface">{valor}</span>
      </div>
      <Link
        to={to}
        className="font-label-md text-label-md shrink-0 self-center text-primary underline underline-offset-4"
      >
        {etiquetaAccion}
      </Link>
    </div>
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

      {/* En mobile, columna única (mismo orden de siempre). En escritorio,
          grilla de 5: la tarjeta de perfil ocupa 2, pedidos+configuración
          ocupan 3. `items-start` es obligatorio: sin él las dos columnas se
          estiran a la altura de la más alta y la tarjeta de perfil queda con
          un hueco vacío abajo. */}
      <div
        data-testid="grilla-mi-cuenta"
        className="flex flex-col gap-4 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6"
      >
        <section
          data-testid="tarjeta-perfil"
          className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 lg:col-span-2"
        >
          <div className="flex items-center gap-3.5">
            <span
              data-testid="avatar-iniciales"
              aria-hidden="true"
              className="font-headline-md text-headline-md flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white lg:h-24 lg:w-24"
            >
              {iniciales(nombreVisible)}
            </span>
            <h2 data-testid="nombre-visible" className="font-headline-md text-headline-md text-on-surface">
              {nombreVisible}
            </h2>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-dashed border-outline-variant pt-3.5">
            <FilaContacto
              icono="mail"
              rotulo="Email"
              valor={perfil.email}
              to="/cuenta/email"
              etiquetaAccion="Cambiar"
            />
            <FilaContacto
              icono="call"
              rotulo="Teléfono"
              valor={perfil.telefono}
              to="/cuenta/datos"
              etiquetaAccion="Editar"
            />
          </div>

          {/* "Cerrar sesión" vive ADENTRO de la tarjeta de perfil, como botón
              de ancho completo al pie. Se conserva la confirmación de dos
              pasos con sus textos literales: cambia dónde vive el botón, no
              cómo se comporta. */}
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
                  className="font-label-lg text-label-lg min-h-11 text-on-surface-variant"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoSalida(true)}
                className="font-label-lg text-label-lg flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-surface-container-lowest px-4 py-3.5 text-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Cerrar sesión
              </button>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <Link
            to="/cuenta/pedidos"
            className="flex items-center justify-between gap-3 rounded-2xl bg-brand-teal p-4 text-white lg:p-6"
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <span aria-hidden="true" className="material-symbols-outlined">
                  inventory_2
                </span>
              </span>
              <span className="flex flex-col text-left">
                <span className="font-headline-sm text-headline-sm">Mis pedidos</span>
                <span className="font-label-md text-label-md text-white/80">Ver historial</span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[18px] lg:flex lg:h-8 lg:w-8 lg:items-center lg:justify-center lg:rounded-full lg:bg-white/10"
            >
              chevron_right
            </span>
          </Link>

          <section className="flex flex-col gap-2">
            <h2 className="font-label-md text-label-md px-1 uppercase tracking-wide text-on-surface-variant">
              Configuración
            </h2>
            <div
              data-testid="lista-configuracion"
              className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent"
            >
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
              {/* Un `null` no renderiza ningún nodo, así que `divide-y` (que
                  separa con `> * + *`) no deja ningún borde huérfano cuando
                  falta el número: la lista se cierra sola en la fila
                  anterior. */}
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
        </div>
      </div>
    </div>
  );
}

export default MiCuenta;
