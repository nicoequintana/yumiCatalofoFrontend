import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useBloquearScroll from "../hooks/useBloquearScroll.js";
import useCarrito from "../hooks/useCarrito.js";
import useCategoriasNavbar from "../hooks/useCategoriasNavbar.js";
import useContextoComercial from "../hooks/useContextoComercial.js";
import useDialogo from "../hooks/useDialogo.js";
import LogoYima from "./LogoYima.jsx";
import PanelCategorias from "./PanelCategorias.jsx";

/**
 * Navegación principal del catálogo público. Es la única lista de destinos del
 * header: la usan tanto la barra de escritorio como el panel móvil, así que un
 * destino nuevo se agrega en un solo lugar.
 *
 * `Productos` ya NO es un destino de esta lista: en la barra de escritorio es
 * el disparador del dropdown de categorías (`PanelCategorias`), así que se
 * escribe a mano en el JSX en vez de mapearse desde acá. Antes no había forma
 * de ofrecer categorías porque un link a `/coleccion?categoria=…` perdía el
 * filtro (`Coleccion.jsx` blanquea los filtros heredados al MONTAR, y ese
 * link no remonta si ya estabas en `/coleccion`). Ese impedimento se resolvió
 * al existir `/coleccion/categoria/:slug`, que sí es una ruta propia.
 */
const DESTINOS = [{ to: "/", texto: "Inicio", esActivo: (pathname) => pathname === "/" }];

/**
 * Header público: wordmark a la izquierda, navegación al centro y acciones a la
 * derecha, con panel desplegable en móvil.
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
 * **Todo lo público cae bajo el mismo guard `esAdmin`** — navegación, acciones y
 * botón de menú — porque `/catalogo/admin/login` se renderiza dentro de este
 * mismo `Layout`. Lo único que sobrevive ahí es el wordmark, que sigue siendo un
 * link a la home.
 *
 * El badge del carrito solo aparece con `cantidadTotal > 0` (nada de un "0"
 * permanente) y favoritos sigue sin contador: es una asimetría confirmada entre
 * las dos features, no una inconsistencia a emparejar.
 */
function Navbar() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/catalogo/admin");
  const { cantidadTotal } = useCarrito();
  const { categorias } = useCategoriasNavbar();

  // El Doodle sale del contexto comercial, que se pide una sola vez por carga
  // de página y lo comparten todos los consumidores. Cuál de los dos aplica lo
  // decide la superficie: el panel y el catálogo son públicos distintos, y una
  // campaña puede querer marca festiva en uno y no en el otro.
  const { doodle, doodleAdmin } = useContextoComercial();
  const doodleDelHeader = (esAdmin ? doodleAdmin : doodle)?.url ?? null;

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
  const disparadorCategoriasRef = useRef(null);
  const panelCategoriasRef = useRef(null);

  // Navegar cierra el panel. Sin esto, tocar un destino cambia la página por
  // detrás de un menú que sigue tapándola.
  useEffect(() => {
    setMenuAbierto(false);
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

  // El panel es una superficie modal de verdad (cubre la página con un velo),
  // así que le corresponde la semántica completa de diálogo: foco inicial
  // adentro, trampa de foco, Escape y devolución del foco al botón que lo abrió.
  // `useDialogo` es el módulo compartido que ya resuelve las cuatro.
  const panelRef = useDialogo({
    abierto: menuAbierto,
    onCerrar: () => setMenuAbierto(false),
  });

  // Con el panel abierto la página de atrás no debe scrollear: está tapada, y
  // el gesto de scroll ahí mueve contenido que no se ve.
  useBloquearScroll(menuAbierto);

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
  //
  // El VELO del panel móvil se renderiza como HERMANO del `<header>`, no
  // adentro, y eso es obligatorio desde que existe este vidrio: un elemento
  // con `backdrop-filter` se vuelve el bloque contenedor de sus descendientes
  // `fixed`, así que un velo hijo del header queda preso de la caja del
  // header en vez de cubrir la ventana. Medido en Chromium con el menú
  // abierto: iba de 114px a 307px, o sea exactamente el rango del panel que
  // se pinta encima — invisible, y sin capturar un solo click, con lo cual
  // "tocar afuera para cerrar" no funcionaba. Como hermano recupera el
  // viewport y vuelve a velar la página entera.
  return (
    <>
    {/* `top-[var(--alto-cinta-ambiente)]`, no `top-0`: la variable la declara
        `CintaAmbiente.jsx` (ver `index.css`) y vale el alto real de la cinta
        de dev mientras existe en el DOM, `0px` en producción — el mismo
        `top-0` de siempre, así que el sitio publicado no cambia. Sin esto la
        cinta, `fixed` y sin empujar el layout, tapaba la mitad superior del
        header. */}
    <header className="vidrio-header sticky top-[var(--alto-cinta-ambiente)] z-50 w-full bg-background/70 shadow backdrop-blur-[10px]">
      {/* `relative z-50` no es decorativo: el velo del panel móvil es `fixed`
          con z-index, y dentro del contexto de apilado que crea el header
          sticky un elemento posicionado se pinta por encima de uno estático.
          Sin esto, el velo taparía la propia barra y el botón "Cerrar menú"
          dejaría de ser clickeable. */}
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
      <div className="relative z-50 mx-auto flex h-navbar-height w-full max-w-container-max items-center justify-between gap-4 px-margin-mobile md:grid md:h-navbar-height-md md:grid-cols-[1fr_auto_1fr] md:px-margin-desktop">
        {/* El Doodle de la campaña activa reemplaza al wordmark. Sin campaña
            —el caso normal— `doodle` es null y `LogoYima` pinta la marca de
            siempre. En el panel manda el Doodle del panel, que puede ser el de
            otra campaña o ninguno: son dos públicos distintos y cada campaña
            decide por separado dónde aparece. */}
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-80">
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
                        className={`inline-block border-b-2 pb-1 font-body-md text-body-md font-medium transition-colors ${
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
                    className={`inline-flex items-center gap-1 border-b-2 pb-1 font-body-md text-body-md font-medium transition-colors ${
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

            <div className="flex items-center gap-1 md:justify-end md:gap-2">
              <Link to="/coleccion" aria-label="Buscar productos" className={claseAccion}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  search
                </span>
              </Link>

              {/* Favoritos queda fuera de la fila en móvil (vive en el panel,
                  como en el mockup). El link del panel se rotula "Favoritos" a
                  secas, así que aunque los dos estuvieran montados a la vez
                  nunca comparten nombre accesible con este. */}
              <Link
                to="/favoritos"
                aria-label="Ver favoritos"
                className={`${claseAccion} hidden md:inline-flex`}
              >
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

              <button
                type="button"
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
                onClick={() => setMenuAbierto((abierto) => !abierto)}
                className={`${claseAccion} md:hidden`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
                  {menuAbierto ? "close" : "menu"}
                </span>
              </button>
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

      {/* El panel se MONTA solo mientras está abierto, en vez de quedar oculto
          con `hidden`. Además de ser lo correcto para el foco, evita duplicar
          destinos en el DOM: con las dos copias montadas, cualquier consulta
          por rol o texto encontraría dos nodos para el mismo link. */}
      {menuAbierto && !esAdmin ? (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            tabIndex={-1}
            className="relative z-50 border-t border-outline-variant bg-background px-margin-mobile pb-6 pt-2 md:hidden"
          >
            <ul className="flex flex-col">
              {/* El panel móvil todavía no tiene su propio dropdown de
                  categorías (llega en la Fase E, con la hoja que monta
                  `PanelCategorias`): mientras tanto conserva el link directo a
                  `/coleccion`, así que "Productos" se agrega a mano acá y no
                  sale de `DESTINOS`. */}
              {[
                ...DESTINOS,
                {
                  to: "/coleccion",
                  texto: "Productos",
                  esActivo: (ruta) => ruta.startsWith("/coleccion"),
                },
                { to: "/favoritos", texto: "Favoritos" },
              ].map((destino) => (
                <li key={destino.to}>
                  <Link
                    to={destino.to}
                    aria-current={destino.esActivo?.(pathname) ? "page" : undefined}
                    className="flex min-h-11 items-center border-b border-outline-variant py-3 font-body-lg text-body-lg text-on-surface"
                  >
                    {destino.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
      ) : null}
    </header>

    {/* Velo del panel móvil — HERMANO del `<header>`, ver el comentario de
        arriba: adentro quedaría preso del bloque contenedor que crea el
        `backdrop-filter` y no velaría nada. Acá `inset-0` vuelve a ser la
        ventana, así que oscurece la página y captura el click de cerrar en
        toda el área libre.

        Se pinta DEBAJO del header (`z-40` contra `z-50`), que es lo que deja
        la barra legible con el menú abierto: lo poco que se cuela por el 30%
        translúcido del header es un velo al 20% —mucho más claro que el fondo
        negro contra el que se calculó el contraste—, así que no mueve la cota.

        `opacity-20` sobre el nodo entero y no `bg-inverse-surface/20` es
        indistinto desde que los tokens están en canales (23/08); se conserva
        porque el velo no tiene contenido y bajarle la opacidad no arrastra
        nada más. */}
    {menuAbierto && !esAdmin ? (
      <div
        className="fixed inset-0 z-40 bg-inverse-surface opacity-20 md:hidden"
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
      />
    ) : null}
    </>
  );
}

export default Navbar;
