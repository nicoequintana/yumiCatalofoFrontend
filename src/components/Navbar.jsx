import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useCarrito from "../hooks/useCarrito.js";
import useCategoriasNavbar from "../hooks/useCategoriasNavbar.js";
import useContextoComercial from "../hooks/useContextoComercial.js";
import LogoYima from "./LogoYima.jsx";
import PanelCategorias from "./PanelCategorias.jsx";
import { AREA_TACTIL_ANCHA, AREA_TACTIL_ICONO } from "../utils/areaTactil.js";

/**
 * Navegación principal del catálogo público, solo para la barra de escritorio:
 * por debajo de `md` la navegación vive en `NavFlotante` y en `HojaMenu`, que
 * tienen su propia lista de destinos.
 *
 * `Productos` ya NO es un destino de esta lista: en la barra de escritorio es
 * el disparador del dropdown de categorías (`PanelCategorias`), así que se
 * escribe a mano en el JSX en vez de mapearse desde acá. Antes no había forma
 * de ofrecer categorías porque un link a `/coleccion?categoria=…` perdía el
 * filtro (`Coleccion.jsx` blanquea los filtros heredados al MONTAR, y ese
 * link no remonta si ya estabas en `/coleccion`). Ese impedimento se resolvió
 * al existir `/coleccion/categoria/:slug`, que sí es una ruta propia. Es la
 * única escritura a mano de "Productos": la que tenía el panel móvil viejo se
 * fue con él.
 */
const DESTINOS = [{ to: "/", texto: "Inicio", esActivo: (pathname) => pathname === "/" }];

/**
 * Header público: wordmark a la izquierda, navegación al centro y acciones a la
 * derecha, en escritorio (`md+`). **Por debajo de `md` la barra queda con el
 * logo y las tres acciones** (lupa, favoritos, carrito). La navegación por
 * destino ("Inicio", el dropdown de "Productos") y el botón de menú viven en
 * `NavFlotante` (la isla) y en `HojaMenu` (lo que abre), montados aparte en
 * `Layout.jsx` — este componente ya no tiene panel ni botón de menú propios.
 *
 * **Esta barra se muestra en TODAS las rutas públicas, la ficha incluida.** En
 * la ficha es la única forma de llegar al carrito y a favoritos, porque ahí la
 * isla no se monta: esa pantalla tiene su propia barra de compra fija abajo y
 * la isla le tapaba el botón "Agregar" (ver el guard en `NavFlotante.jsx`).
 *
 * **No hay ícono de cuenta**, aunque el mockup lo mostraba: este proyecto no
 * tiene login público — el checkout es de invitado por DNI. Un ícono de persona
 * sería un control que no lleva a ninguna parte.
 *
 * **La lupa navega a `/coleccion`, no abre un input acá.** El buscador real es
 * el de `FiltrosCatalogo`, que además escribe el término en la URL; un segundo
 * campo en el header serían dos buscadores compitiendo por el mismo estado. Su
 * `aria-label` es "Buscar productos" y no "Buscar" justamente para no colisionar
 * con el nombre accesible de ese input.
 *
 * **Todo lo público cae bajo el mismo guard `esAdmin`** — navegación y acciones
 * — porque `/catalogo/admin/login` se renderiza dentro de este mismo `Layout`.
 * Lo único que sobrevive ahí es el wordmark, que sigue siendo un link a la home.
 *
 * El badge del carrito solo aparece con `cantidadTotal > 0` (nada de un "0"
 * permanente) y favoritos sigue sin contador: es una asimetría confirmada entre
 * las dos features, no una inconsistencia a emparejar.
 */
function Navbar() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const { cantidadTotal } = useCarrito();
  // `activo: !esAdmin`: en `/catalogo/admin/login` —la única ruta de admin que
  // cuelga de este `Layout` público— el dropdown de categorías no existe, y
  // sin este freno la request salía igual porque el hook se invoca antes del
  // guard `esAdmin` de más abajo (las reglas de hooks no dejan condicionarlo).
  const { categorias } = useCategoriasNavbar({ activo: !esAdmin });

  // El Doodle sale del contexto comercial, que se pide una sola vez por carga
  // de página y lo comparten todos los consumidores. Cuál de los dos aplica lo
  // decide la superficie: el panel y el catálogo son públicos distintos, y una
  // campaña puede querer marca festiva en uno y no en el otro.
  const { doodle, doodleAdmin } = useContextoComercial();
  const doodleDelHeader = (esAdmin ? doodleAdmin : doodle)?.url ?? null;

  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
  const disparadorCategoriasRef = useRef(null);
  const panelCategoriasRef = useRef(null);

  // Navegar cierra el dropdown. Sin esto, tocar un destino cambia la página
  // por detrás de un panel que sigue montado.
  useEffect(() => {
    setCategoriasAbiertas(false);
  }, [pathname]);

  // El dropdown de categorías NO usa `useDialogo` a propósito: no es una
  // superficie modal —no vela la página ni bloquea el scroll—, y una trampa de
  // foco encerraría el tabulado en un menú del que se sale tabulando. Lo que
  // sí necesita del tratamiento de diálogo es Escape y devolver el foco.
  useEffect(() => {
    if (!categoriasAbiertas) return undefined;

    const alTeclado = (evento) => {
      if (evento.key !== "Escape") return;
      setCategoriasAbiertas(false);
      disparadorCategoriasRef.current?.focus();
    };
    const alClick = (evento) => {
      if (panelCategoriasRef.current?.contains(evento.target)) return;
      if (disparadorCategoriasRef.current?.contains(evento.target)) return;
      setCategoriasAbiertas(false);
    };

    document.addEventListener("keydown", alTeclado);
    document.addEventListener("mousedown", alClick);
    return () => {
      document.removeEventListener("keydown", alTeclado);
      document.removeEventListener("mousedown", alClick);
    };
  }, [categoriasAbiertas]);

  const claseAccion =
    "relative inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high";

  // Fondo TRANSLÚCIDO + `backdrop-blur`: la barra queda pegada al tope y el
  // contenido pasa desenfocado por detrás en vez de chocar contra un bloque
  // opaco. Es lo mismo que ya hace el panel de vidrio de `CarruselDestacados`,
  // y funciona por el mismo motivo: los tokens de color viven en CANALES
  // (`rgb(var(--color-background) / <alpha-value>)`), así que Tailwind puede
  // componerles alfa. Con un hex adentro de la variable, `bg-background/70`
  // no emitiría NINGUNA regla y el header quedaría transparente del todo.
  //
  // `backdrop-blur-[10px]` emite además `-webkit-backdrop-filter` por su
  // cuenta (Tailwind 3 lo incluye en la utilidad), que es lo que necesita
  // Safari — no hace falta declararlo a mano ni desde autoprefixer.
  //
  // El alfa es `/70` y NO `/50`, y es una cota de contraste, no una
  // preferencia: el desenfoque difumina el fondo pero no lo aclara, así que
  // el peor caso sigue siendo una foto oscura pareja pasando por detrás.
  // Sobre negro, el crema al 50% da `#7f7c7a` y `text-on-surface` (#1d1b1a)
  // queda en 4,14:1 — debajo del 4,5:1 que pide WCAG AA. Al 70% da `#b2aeab`
  // y sube a 7,78:1. Bajar este número vuelve a romper la barra sobre el
  // hero de la home y sobre la galería de la ficha, que son justo las dos
  // pantallas donde una foto grande scrollea por abajo.
  //
  // `vidrio-header` (en `index.css`) es el fallback: donde no hay
  // `backdrop-filter`, el fondo pasa a opaco. Sin esa regla, un cliente sin
  // soporte no se pierde el efecto — se queda con una barra semitransparente
  // y el contenido NÍTIDO por detrás, que es peor que no haber intentado nada.
  return (
    // `top-[var(--alto-cinta-ambiente)]`, no `top-0`: la variable la declara
    // `CintaAmbiente.jsx` (ver `index.css`) y vale el alto real de la cinta
    // de dev mientras existe en el DOM, `0px` en producción — el mismo
    // `top-0` de siempre, así que el sitio publicado no cambia. Sin esto la
    // cinta, `fixed` y sin empujar el layout, tapaba la mitad superior del
    // header.
    <header className="vidrio-header sticky top-[var(--alto-cinta-ambiente)] z-50 w-full bg-background/70 shadow backdrop-blur-[10px]">
      {/* Alto FIJO (`h-navbar-height`), no derivado del padding. Es la mitad
          de un contrato: `FiltrosCatalogo.jsx` se pega debajo con
          `top-navbar-height`, el MISMO token. Mientras el alto salía del
          contenido (`py-4`/`py-5`), la barra sticky del catálogo se clavaba
          más abajo de donde este header terminaba y quedaba un hueco por el
          que se veía pasar la grilla. Si esta barra necesita más aire, se
          sube el token — nunca se vuelve a un padding, que reabre el hueco
          sin que nada falle. Desde la cinta de dev, el contrato ganó una
          TERCERA punta: `FiltrosCatalogo.jsx` no se pega solo a
          `navbar-height`, sino a `navbar-height` MÁS `--alto-cinta-ambiente`
          (ver el `top` de este header, arriba). */}
      {/* SIN `bg-background`: el fondo lo pone el `<header>`, que es el que
          lleva la opacidad y el desenfoque. Un fondo sólido acá tapa ese
          vidrio en toda la franja del contenido — el blur se aplicaría igual,
          detrás de una capa opaca, y no se vería nada. */}
      <div
        className={`relative z-50 mx-auto flex h-navbar-height w-full max-w-container-max items-center ${
          // En admin solo se renderiza el logo (ver el `esAdmin ? null : …` de
          // abajo), y ahí sigue centrado como siempre. En público hay logo Y
          // acciones: `justify-between` los manda a los dos extremos. En
          // `md+` esto no cambia nada — el `md:grid` de abajo pisa el
          // `display` y las tres columnas explícitas ignoran `justify-content`
          // porque sus `1fr` ya llenan el ancho entero.
          esAdmin ? "justify-center" : "justify-between"
        } gap-4 px-margin-mobile md:grid md:h-navbar-height-md md:grid-cols-[1fr_auto_1fr] md:px-margin-desktop`}
      >
        {/* El Doodle de la campaña activa reemplaza al wordmark. Sin campaña
            —el caso normal— `doodle` es null y `LogoYima` pinta la marca de
            siempre. En el panel manda el Doodle del panel, que puede ser el de
            otra campaña o ninguno: son dos públicos distintos y cada campaña
            decide por separado dónde aparece. */}
        {/* Área táctil: medido en navegador el 07/09/2026 con
            `elementFromPoint` —el área EFECTIVA, no la caja declarada— el link
            del logo daba 71×28 a 390 y 93×33 a 1280. Va con pseudo-elemento y
            no con `min-h-11` porque el header tiene alto fijo
            (`h-navbar-height`): estirar el link movería el logo dentro de esa
            caja. `before:w-full` copia el ancho propio y no invade al vecino. */}
        <Link
          to="/"
          className={`shrink-0 transition-opacity hover:opacity-80 ${AREA_TACTIL_ANCHA}`}
        >
          <LogoYima className="h-7 md:h-8" doodleUrl={doodleDelHeader} />
        </Link>

        {esAdmin ? null : (
          <>
            <nav aria-label="Navegación principal" className="hidden md:flex md:justify-center">
              <ul className="flex items-center gap-10">
                {DESTINOS.map((destino) => {
                  const activo = destino.esActivo(pathname);
                  return (
                    <li key={destino.to}>
                      <Link
                        to={destino.to}
                        aria-current={activo ? "page" : undefined}
                        // Área táctil: 42×33 medidos el 07/09/2026 con
                        // `elementFromPoint`. Pseudo-elemento y no `min-h-11`
                        // porque el subrayado de activo es el `border-b` del
                        // propio link: al crecer la caja se despegaría del
                        // texto. `before:w-11` porque acá tampoco alcanzaba el
                        // ANCHO —42 contra 44—, y el `gap-10` del `ul` deja
                        // sitio de sobra para los 1,5px que sobresalen de cada
                        // lado.
                        className={`inline-block border-b-2 pb-1 font-body-md text-body-md font-medium transition-colors ${AREA_TACTIL_ICONO} ${
                          activo
                            ? "border-on-surface text-on-surface"
                            : "border-transparent text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {destino.texto}
                      </Link>
                    </li>
                  );
                })}

                <li>
                  <button
                    type="button"
                    ref={disparadorCategoriasRef}
                    aria-expanded={categoriasAbiertas}
                    aria-controls="panel-categorias"
                    onClick={() => setCategoriasAbiertas((abierto) => !abierto)}
                    // Área táctil: 93×33 medidos el 07/09/2026 con
                    // `elementFromPoint`. Solo faltaba el ALTO, así que
                    // `before:w-full` copia el ancho propio: un ancho fijo
                    // taparía el borde del panel de categorías que se abre
                    // justo debajo.
                    className={`inline-flex items-center gap-1 border-b-2 pb-1 font-body-md text-body-md font-medium transition-colors ${AREA_TACTIL_ANCHA} ${
                      pathname.startsWith("/coleccion") || categoriasAbiertas
                        ? "border-on-surface text-on-surface"
                        : "border-transparent text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Productos
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      expand_more
                    </span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* SIN `hidden`: desde el reparto del 05/09/2026 la lupa, favoritos
                y el carrito se ven también por debajo de `md` — la isla
                flotante (`NavFlotante`) se quedó con un solo control, la
                hamburguesa, y estas tres acciones necesitaban un camino que no
                dependiera de abrirla. `md:justify-end` y `md:gap-2` son los
                únicos ajustes propios de escritorio: en mobile alcanza con el
                `gap-1` y la posición la resuelve el `justify-between` del
                contenedor padre. */}
            <div className="flex items-center gap-1 md:justify-end md:gap-2">
              {/* DECISIÓN: la lupa NO marca `/coleccion` como activa, aunque
                  lleve ahí. Antes del reparto del 05/09/2026, la ranura de
                  Buscar de la isla SÍ lo hacía (`aria-current="page"` +
                  cápsula cuando `pathname` empezaba con `/coleccion`) — esa
                  lógica no migró, y es a propósito, no un olvido: la lupa es
                  una ACCIÓN ("andá a buscar"), no un destino de sección, y en
                  escritorio ese mismo estado ya lo lleva el disparador
                  "Productos" de más arriba (`pathname.startsWith("/coleccion")`).
                  Agregarle `aria-current` acá duplicaría esa señal en dos
                  controles con roles distintos por la misma ruta. */}
              <Link to="/coleccion" aria-label="Buscar productos" className={claseAccion}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  search
                </span>
              </Link>

              <Link to="/favoritos" aria-label="Ver favoritos" className={claseAccion}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  favorite
                </span>
              </Link>

              <Link to="/carrito" aria-label="Ver carrito" className={claseAccion}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  shopping_bag
                </span>
                {cantidadTotal > 0 ? (
                  <span className="font-label-sm text-label-sm absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-inverse-surface px-1 text-background">
                    {cantidadTotal}
                  </span>
                ) : null}
              </Link>
            </div>
          </>
        )}
      </div>

      {categoriasAbiertas ? (
        <div
          id="panel-categorias"
          ref={panelCategoriasRef}
          className="absolute inset-x-0 top-full z-50 hidden border-t border-outline-variant bg-surface-container-lowest shadow md:block"
        >
          <div className="mx-auto w-full max-w-container-max px-margin-desktop py-4">
            <PanelCategorias
              categorias={categorias}
              onNavegar={() => setCategoriasAbiertas(false)}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
