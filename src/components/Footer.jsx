import { Link, useLocation } from "react-router-dom";
import LogoYima from "./LogoYima.jsx";
import useContextoComercial from "../hooks/useContextoComercial.js";
import useConfigContacto from "../hooks/useConfigContacto.js";
import useWhatsapp from "../hooks/useWhatsapp.js";
import useCategoriasNavbar from "../hooks/useCategoriasNavbar.js";
import { rutaCategoria } from "../utils/slug.js";
import { registrarEvento } from "../api/products.js";

/**
 * Tagline de marca. No hay una descripción de marca ya escrita en otro lado
 * del código (se revisó `constants/seo.js` antes de escribir esto acá: solo
 * tiene identidad técnica de SEO — dominio, nombre, imagen OG—, no una
 * oración de marca), así que se usa el copy de la maqueta aprobada.
 */
const TAGLINE_MARCA = "Objetos para la casa elegidos uno por uno.";

const CLASE_TITULO_COLUMNA =
  "font-label-sm text-label-sm mb-3 block font-bold uppercase tracking-[0.12em] text-on-surface-variant";
const CLASE_LINK_COLUMNA =
  "font-body-md text-body-md text-on-surface transition-colors hover:text-primary";
/** Tarjeta de WhatsApp y de mail de la banda de contacto (`.btn-contacto` del mockup). */
const CLASE_TARJETA_CONTACTO =
  "flex flex-1 items-center gap-3 rounded-2xl bg-surface-container-lowest py-2.5 pl-2.5 pr-4 shadow-sombra-1 transition-shadow hover:shadow-sombra-2 md:pr-6";
const CLASE_LINK_SUB = "font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary";

/** Instagram/Facebook/TikTok, cada uno visible solo si hay URL configurada. */
function RedesSociales({ contacto }) {
  const redes = [
    contacto.instagram && {
      nombre: "Instagram",
      url: contacto.instagram,
      icono: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    contacto.facebook && {
      nombre: "Facebook",
      url: contacto.facebook,
      icono: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.5V21h3Z" />
        </svg>
      ),
    },
    contacto.tiktok && {
      nombre: "TikTok",
      url: contacto.tiktok,
      icono: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
          <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.4.1-2.6-.3-3.9-1.1v5.3c0 6.4-7 8.4-9.8 3.8-1.8-2.9-.7-8.1 5.1-8.3v2.8c-.4.1-.9.2-1.3.3-1.3.4-2 1.3-1.8 2.8.4 2.8 5.2 3.6 4.8-1.8V3h3Z" />
        </svg>
      ),
    },
  ].filter(Boolean);

  if (redes.length === 0) return null;

  return (
    <div className="flex gap-2">
      {redes.map((red) => (
        <a
          key={red.nombre}
          href={red.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={red.nombre}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface transition-colors hover:border-primary hover:text-primary"
        >
          {red.icono}
        </a>
      ))}
    </div>
  );
}

/** Logo + tagline + redes. Se renderiza dos veces (escritorio/mobile): son dos
 * posiciones distintas en el layout — un solo nodo no puede vivir en dos
 * columnas/filas distintas a la vez. */
function BloqueMarca({ doodleUrl, contacto }) {
  return (
    <div className="flex flex-col gap-4">
      <LogoYima className="h-7" doodleUrl={doodleUrl} />
      <p className="font-body-sm text-body-sm max-w-[34ch] text-on-surface-variant">{TAGLINE_MARCA}</p>
      <RedesSociales contacto={contacto} />
    </div>
  );
}

/** Inicio, Productos (+ sublista de categorías publicadas), Favoritos, Carrito. */
function ListaTienda({ categorias }) {
  return (
    <ul className="flex flex-col gap-3">
      <li>
        <Link to="/" className={CLASE_LINK_COLUMNA}>
          Inicio
        </Link>
      </li>
      <li className="flex flex-col gap-2">
        <Link to="/coleccion" className={CLASE_LINK_COLUMNA}>
          Productos
        </Link>
        {categorias.length > 0 ? (
          // Dos columnas en todos los anchos para que ocho categorías no armen
          // un listado largo; tres no entran en el ancho de la columna Tienda
          // ("Cuidado personal" cortaba). En mobile va dentro del desplegable.
          <ul className="grid grid-cols-2 gap-x-[18px] gap-y-1.5 border-l-2 border-surface-container-highest pl-3">
            {categorias.map(({ categoria, ruta }) => (
              <li key={categoria.id}>
                <Link to={ruta} className={CLASE_LINK_SUB}>
                  {categoria.nombre}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
      <li>
        <Link to="/favoritos" className={CLASE_LINK_COLUMNA}>
          Favoritos
        </Link>
      </li>
      <li>
        <Link to="/carrito" className={CLASE_LINK_COLUMNA}>
          Carrito
        </Link>
      </li>
    </ul>
  );
}

/**
 * "Mi cuenta" + "Mis pedidos". Van SIEMPRE a `/cuenta` y `/cuenta/pedidos`: el
 * guard (`RequireAuthCliente`) decide login vs. cuenta ya logueada, el pie no
 * tiene que consultar la sesión para elegir el destino.
 */
function ListaCuenta() {
  return (
    <ul className="flex flex-col gap-3">
      <li>
        <Link to="/cuenta" className={CLASE_LINK_COLUMNA}>
          Mi cuenta
        </Link>
      </li>
      <li>
        <Link to="/cuenta/pedidos" className={CLASE_LINK_COLUMNA}>
          Mis pedidos
        </Link>
      </li>
    </ul>
  );
}

const ICONO_WHATSAPP = (
  <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.36.685 4.56 1.867 6.41L4 29l7.79-1.826A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.818a9.77 9.77 0 0 1-4.98-1.363l-.357-.212-4.62 1.084 1.11-4.5-.234-.368A9.78 9.78 0 0 1 5.2 15c0-5.965 4.85-10.818 10.804-10.818S26.8 9.035 26.8 15 21.958 24.818 16.004 24.818Zm5.61-7.32c-.307-.154-1.818-.898-2.1-1.001-.282-.103-.487-.154-.692.154-.205.308-.794 1.001-.973 1.207-.179.205-.358.23-.665.077-.307-.154-1.296-.478-2.469-1.523-.913-.814-1.53-1.82-1.709-2.128-.179-.308-.019-.474.135-.627.138-.138.307-.358.46-.538.154-.179.205-.307.307-.512.103-.205.052-.384-.026-.538-.077-.154-.692-1.67-.949-2.287-.25-.6-.505-.52-.692-.53l-.59-.01c-.205 0-.538.077-.82.384-.282.308-1.076 1.052-1.076 2.566s1.102 2.977 1.256 3.183c.154.205 2.17 3.313 5.257 4.646.735.317 1.308.507 1.755.649.737.234 1.408.201 1.938.122.591-.088 1.818-.744 2.074-1.462.256-.718.256-1.334.18-1.462-.077-.128-.282-.205-.59-.359Z" />
  </svg>
);

/**
 * Banda de contacto directo: WhatsApp (con el mismo `useWhatsapp` que usa el
 * FAB, así que el link y el evento `CLICK_WHATSAPP` son EXACTAMENTE los
 * mismos, nunca una segunda definición) + mail. Oculta ENTERA si no hay
 * whatsapp NI mail — una banda vacía no tiene nada que ofrecer.
 */
function BandaContacto({ contacto }) {
  const { url: urlWhatsapp } = useWhatsapp({ tipo: "home" });
  const tieneWhatsapp = Boolean(contacto.whatsapp?.numero) && Boolean(urlWhatsapp);
  const tieneEmail = Boolean(contacto.email);

  if (!tieneWhatsapp && !tieneEmail) return null;

  function handleClickWhatsapp() {
    // Mismo evento que `BotonWhatsapp.jsx` — se cuenta cada canal de contacto
    // por igual, sin duplicar la definición del tipo de evento.
    registrarEvento("CLICK_WHATSAPP");
  }

  return (
    // El filete inferior va en la banda y no en un wrapper afuera: sin
    // whatsapp ni mail la banda devuelve `null`, y un wrapper con borde
    // dibujaría una línea suelta sin nada arriba.
    <div className="flex flex-col gap-4 border-b border-surface-container-highest pb-6 md:flex-row md:items-stretch md:gap-4 md:pb-10">
      <div className="flex flex-col justify-center gap-1 md:flex-[1.2]">
        <strong className="font-headline-sm text-headline-sm font-bold text-primary">¿Te ayudamos a elegir?</strong>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Respondemos consultas de productos, envíos y pedidos.
        </span>
      </div>

      {tieneWhatsapp ? (
        <a
          href={urlWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClickWhatsapp}
          // Nombre propio y no "Contactar por WhatsApp": ese es el del FAB y
          // el del botón de la ficha, y en la ficha quedaban dos links
          // homónimos (ambiguo para un lector de pantalla).
          aria-label="Escribinos por WhatsApp"
          className={CLASE_TARJETA_CONTACTO}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#25D366] text-white">
            {ICONO_WHATSAPP}
          </span>
          {/* Sin leyenda de horario: decisión del 13/09/2026, la tarjeta
              dice solo "WhatsApp". */}
          <b className="font-label-lg text-label-lg text-primary">WhatsApp</b>
        </a>
      ) : null}

      {tieneEmail ? (
        <a
          href={`mailto:${contacto.email}`}
          className={CLASE_TARJETA_CONTACTO}
        >
          {/* Blanco (`on-primary`) y no `on-primary-container` (#87b6c5) a
              propósito: es el ícono blanco del mockup, y sobre #144855 da
              10,06:1 contra 4,56:1 del par semántico. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-container text-on-primary">
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
              mail
            </span>
          </span>
          {/* `break-all`: una dirección larga no tiene espacios donde cortar y
              desbordaría la tarjeta a 390px. */}
          <b className="font-label-lg text-label-lg break-all text-primary">{contacto.email}</b>
        </a>
      ) : null}
    </div>
  );
}

/**
 * Ported from home.html L203-213 / catalogo.html L213-223 originalmente; el
 * 13/09/2026 se reemplazó el pie mínimo del catálogo público por el diseño
 * aprobado (mockup "Pie de YIMA"): banda de contacto directo, mapa del sitio
 * en columnas y barra legal — boards 1 y 2 de esa maqueta. **Fuera de
 * alcance de esta tanda**: la página de ayuda (board 3), la columna "Ayuda" y
 * el link de Términos de la barra inferior. El de Privacidad (`/privacidad`)
 * se sumó el 14/09/2026: Google exige una URL de política para publicar la
 * pantalla de consentimiento del ingreso con Google.
 *
 * `/catalogo/admin/login` (la única ruta de admin que cuelga de este Layout
 * público) sigue con el pie MÍNIMO de siempre — logo + copyright —, sin la
 * banda de contacto ni el mapa del sitio: esa pantalla no vende nada y no
 * tiene categorías ni carrito que ofrecer.
 *
 * DOODLE. El pie lleva el mismo arte que el encabezado, y con la MISMA regla:
 * cuál de los dos Doodles aplica lo decide la superficie, porque el panel y el
 * catálogo son públicos distintos y una campaña puede querer marca festiva en
 * uno y no en el otro (ver `Navbar.jsx`). Sin esa simetría,
 * `/catalogo/admin/login` —que usa este mismo Layout— mostraría dos artes
 * distintos en la misma pantalla, y eso se lee como una imagen que no cargó.
 */
function Footer() {
  const { pathname } = useLocation();
  const { doodle, doodleAdmin } = useContextoComercial();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const doodleDelPie = (esAdmin ? doodleAdmin : doodle)?.url ?? null;

  // Los hooks se llaman SIEMPRE, incluso en la rama admin: las reglas de
  // hooks no permiten condicionarlos, y el cache module-level de
  // `useConfigContacto`/`useCategoriasNavbar` ya evita el request de más
  // (mismo criterio que `useCategoriasNavbar({ activo: !esAdmin })` en
  // `Navbar.jsx` — acá no hace falta ni ese freno porque el login no
  // renderiza el mapa del sitio que las consume).
  const { contacto } = useConfigContacto();
  // `activo: !esAdmin`, mismo freno que usa `Navbar.jsx`: en
  // `/catalogo/admin/login` el mapa del sitio no se dibuja, así que la
  // request de categorías no hace falta ahí.
  const { categorias } = useCategoriasNavbar({ activo: !esAdmin });

  if (esAdmin) {
    // El pie mínimo de siempre: `/catalogo/admin/login` cuelga de este mismo
    // Layout público y no vende nada — ni banda de contacto, ni mapa del
    // sitio, ni barra legal.
    return (
      <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-container-max flex-col items-center justify-between px-margin-mobile py-8 md:flex-row md:px-margin-desktop">
          <div className="mb-6 md:mb-0">
            <LogoYima className="h-8 opacity-80 transition-opacity hover:opacity-100" doodleUrl={doodleDelPie} />
          </div>
          <div>
            <span className="font-body-md text-body-md text-sm text-on-surface-variant">
              Todos los derechos reservados © 2026 | YIMA
            </span>
          </div>
        </div>
      </footer>
    );
  }

  const categoriasConRuta = categorias
    .map((categoria) => ({ categoria, ruta: rutaCategoria(categoria) }))
    .filter((c) => c.ruta);

  return (
    <footer className="w-full bg-surface-container-low">
      {/* El zócalo de la isla flotante vive en ESTE wrapper —el único hijo
          directo del `<footer>` que envuelve TODO el contenido real,
          barra legal incluida— y no como un `<div>` suelto después: la isla
          es `fixed` y tapa el final del contenido, y un separador sin fondo
          se leería como una franja vacía debajo del pie. `pb-24` reserva
          esos 96px solo en mobile (`NavFlotante` es `md:hidden`); `md:pb-8`
          es el margen de siempre en escritorio, sin isla que esquivar.

          `publico-mobile.spec.js` mide justo esto: `footer.firstElementChild`
          tiene que ser el nodo que carga el padding, y su borde inferior
          MENOS ese padding tiene que coincidir con donde termina el
          contenido real — por eso la barra legal va ADENTRO de este mismo
          wrapper y no como hermano suelto después. */}
      <div className="flex w-full flex-col gap-6 pb-24 pt-8 md:gap-10 md:pb-8 md:pt-12">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
          <BandaContacto contacto={contacto} />
        </div>

        {/* Escritorio: tres columnas lado a lado. */}
        <div className="mx-auto hidden w-full max-w-container-max px-margin-desktop md:grid md:grid-cols-[1.4fr_1fr_1fr] md:gap-10">
          <BloqueMarca doodleUrl={doodleDelPie} contacto={contacto} />
          <div>
            <span className={CLASE_TITULO_COLUMNA}>Tienda</span>
            <ListaTienda categorias={categoriasConRuta} />
          </div>
          <div>
            <span className={CLASE_TITULO_COLUMNA}>Mi cuenta</span>
            <ListaCuenta />
            {/* Sin bloque de showroom: decisión del 13/09/2026, no se muestra
                en el catálogo por ahora aunque `contacto.direccion` esté
                cargada. El dato se sigue editando en Configuración › Contacto. */}
          </div>
        </div>

        {/* Mobile: grupos plegables nativos (sin JS) + logo/redes al pie. */}
        <div className="mx-auto flex w-full max-w-container-max flex-col gap-5 px-margin-mobile md:hidden">
          <details open className="border-b border-surface-container-highest pb-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-label-sm text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant [&::-webkit-details-marker]:hidden">
              Tienda
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                expand_more
              </span>
            </summary>
            <div className="mt-3 pb-1">
              <ListaTienda categorias={categoriasConRuta} />
            </div>
          </details>

          <details className="border-b border-surface-container-highest pb-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-label-sm text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant [&::-webkit-details-marker]:hidden">
              Mi cuenta
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                expand_more
              </span>
            </summary>
            <div className="mt-3 pb-1">
              <ListaCuenta />
            </div>
          </details>

          <div className="flex items-center justify-between pt-1">
            <LogoYima className="h-7" doodleUrl={doodleDelPie} />
            <RedesSociales contacto={contacto} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col items-center gap-1 border-t border-surface-container-highest pt-4 md:flex-row md:justify-between">
            <span className="font-body-sm text-[12px] text-on-surface-variant">
              © 2026 YIMA · Todos los derechos reservados
            </span>
            {/* `min-h-11`: piso táctil; `inline-flex` para que un `<a>` lo respete. */}
            <Link
              to="/privacidad"
              className="font-body-sm inline-flex min-h-11 items-center text-[12px] text-on-surface-variant underline-offset-2 transition-colors hover:text-primary hover:underline"
            >
              Política de privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
