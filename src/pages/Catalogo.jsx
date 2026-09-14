import { Link } from "react-router-dom";
import BuscadorSugerencias from "../components/BuscadorSugerencias.jsx";
import CargandoPagina from "../components/CargandoPagina.jsx";
import CarruselCampanias from "../components/CarruselCampanias.jsx";
import CarruselDestacados from "../components/CarruselDestacados.jsx";
import CirculosCategoria from "../components/CirculosCategoria.jsx";
import Confianza from "../components/Confianza.jsx";
import MasVendidos from "../components/MasVendidos.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import NuevosIngresos from "../components/NuevosIngresos.jsx";
import ProductoIcono from "../components/ProductoIcono.jsx";
import PromosActivas from "../components/PromosActivas.jsx";
import VitrinasCampania from "../components/VitrinasCampania.jsx";
import { useCategoriasHome } from "../hooks/useCategoriasNavbar.js";
import useContextoComercial from "../hooks/useContextoComercial.js";
import useDestacados from "../hooks/useDestacados.js";
import useMasVendidos from "../hooks/useMasVendidos.js";
import useNuevosIngresos from "../hooks/useNuevosIngresos.js";
import useOfertas from "../hooks/useOfertas.js";
import useProductoIcono from "../hooks/useProductoIcono.js";
import usePromoDestacada from "../hooks/usePromoDestacada.js";
import useTechoDeEspera from "../hooks/useTechoDeEspera.js";
import useVitrinasCampania from "../hooks/useVitrinasCampania.js";
import { urlAbsoluta } from "../constants/seo.js";

/**
 * Revelado escalonado de la entrada del hero.
 *
 * `animationFillMode: "backwards"` NO es opcional: sin él, durante el retardo
 * el elemento se pinta en su estado final (opacidad 1) y recién al arrancar la
 * animación salta a 0 — un parpadeo, exactamente lo contrario del efecto
 * buscado. La clase va con la variante `motion-safe:`, así que con
 * `prefers-reduced-motion` no hay animación y este `style` queda inerte.
 */
function revelado(retardoMs) {
  return { animationDelay: `${retardoMs}ms`, animationFillMode: "backwards" };
}

/**
 * `/` — home de la tienda (rediseño 13/09/2026, spec
 * 2026-09-13-rediseno-home-publica).
 *
 * Orden en el DOM: campañas → hero → buscador (mobile) → círculos → promos
 * activas → vitrinas de campaña → más vendidos → producto ícono → nuevos
 * ingresos → destacados → confianza. El hero se ve después de las campañas
 * en escritorio y AL PIE en
 * mobile, y eso lo hace CSS `order` sobre un único nodo — nunca dos renders:
 * hay un solo `<h1>` en la página.
 *
 * El catálogo completo con filtros vive en `/coleccion` (`Coleccion.jsx`).
 */
function Catalogo() {
  const { productos: destacados, resuelto: destacadosResueltos } = useDestacados();
  const { slides, resuelto: contextoResuelto } = useContextoComercial();
  // El mismo hook que consume `CirculosCategoria` puertas adentro. Llamarlo
  // DOS veces no cuesta una segunda request: cachea a nivel de módulo, con una
  // sola promesa en vuelo compartida por todos los montajes. Las demás
  // secciones reciben sus datos por prop — sus hooks fetchean por instancia y
  // ahí sí habría dos requests.
  const { resuelto: categoriasResueltas } = useCategoriasHome();
  const { productos: ofertas, error: errorOfertas, resuelto: ofertasResueltas } = useOfertas();
  const { promo: promoDestacada, resuelto: promoResuelta } = usePromoDestacada();
  const {
    productos: masVendidos,
    error: errorMasVendidos,
    resuelto: masVendidosResueltos,
  } = useMasVendidos();
  const { producto: productoIcono, resuelto: productoIconoResuelto } = useProductoIcono();
  const { productos: nuevosIngresos, resuelto: nuevosResueltos } = useNuevosIngresos();
  const {
    vitrinas: vitrinasCampania,
    error: errorVitrinasCampania,
    resuelto: vitrinasResueltas,
  } = useVitrinasCampania();

  /**
   * ⚠️ **ESTE LOADER ESCONDE UN PROBLEMA, NO LO ARREGLA.**
   *
   * Medido en producción con Playwright el 07/09/2026: el hero saltaba 792 px
   * y el CLS de la home daba 0,407 (Google llama "malo" a todo lo que pase de
   * 0,25). La causa: las secciones devuelven `null` mientras no tienen datos
   * y, en mobile, el hero va al pie, así que lo empujan hacia abajo cuando los
   * fetch aterrizan.
   *
   * Tapar la página hasta que las fuentes contesten hace que ese empujón
   * ocurra sin nadie mirando. **La causa queda intacta**: quien sume una
   * sección que también empiece en `null` va a agrandar el salto escondido.
   *
   * Las nueve fuentes van enumeradas y no derivadas de una lista: si mañana
   * hay una décima, tiene que aparecer acá a mano, y eso es deliberado — una
   * fuente nueva sin su `resuelto` es justo lo que el techo de abajo cubre.
   */
  const fuentesResueltas =
    contextoResuelto &&
    categoriasResueltas &&
    ofertasResueltas &&
    destacadosResueltos &&
    promoResuelta &&
    masVendidosResueltos &&
    productoIconoResuelto &&
    nuevosResueltos &&
    vitrinasResueltas;

  // La red de seguridad: pasado el techo la home se dibuja con lo que haya.
  // Un loader sin techo es un sitio caído — ver `useTechoDeEspera.js`.
  const techoVencido = useTechoDeEspera();
  const listo = fuentesResueltas || techoVencido;

  /**
   * Los meta tags quedan FUERA del gate a propósito, y por eso viven en una
   * constante en vez de repetirse en las dos ramas: no producen layout —así
   * que taparlos no evitaría ningún salto— y dejarlos afuera hace que el
   * `<title>`, el canonical y las tarjetas de OpenGraph estén bien desde el
   * primer render en vez de aparecer dos segundos tarde. Van en la misma
   * posición de los dos fragmentos, así que React reconcilia el MISMO
   * `MetaSeo` al levantarse el velo, sin desmontarlo ni volver a montarlo.
   */
  const metaHome = (
    <MetaSeo
      titulo="YIMA — Productos útiles, innovadores y con diseño"
      descripcion="Productos útiles, innovadores y con diseño que simplifican tu rutina y suman estilo a tu hogar, tu trabajo y tus momentos."
      canonical={urlAbsoluta("/")}
    />
  );

  if (!listo) {
    return (
      <>
        {metaHome}
        <CargandoPagina />
      </>
    );
  }

  return (
    <>
      {metaHome}

      {/* Columna flex: es lo que deja reordenar el hero con `order` sin mover
          el nodo. Es un `div` y no un `<main>`: el landmark ya lo pone
          `Layout.jsx`, y anidar dos rompe la navegación por regiones. Cada
          hijo lleva `data-seccion-home` para que el orden del DOM sea
          verificable en tests (jsdom no aplica CSS). Los envoltorios existen
          aunque la sección devuelva `null`: un div vacío no ocupa alto. */}
      <div className="flex flex-col">
        <div data-seccion-home="campanias">
          <CarruselCampanias slides={slides} />
        </div>

        {/* El hero. En escritorio va acá, después de las campañas
            (`md:order-none` = su lugar del DOM). En mobile `order-last` lo
            manda al pie: con el hero arriba, el primer producto entraba a los
            1.430 px en un teléfono de 412 px (medido el 05/09/2026).

            Mismatch aceptado: por debajo de `md` el orden del DOM —el del
            foco con Tab y el de un lector de pantalla— llega al h1 y al CTA
            del hero ANTES que a las secciones que el ojo ve primero. Se
            acepta en este corte porque la alternativa es renderizar el hero
            dos veces (dos h1); en escritorio DOM y orden visual coinciden, y
            el HTML del crawler (`cuerpoHome`) sigue el orden del DOM.

            ⚠️ Su copy está espejado en `seo.controller.js` (HERO_TITULO /
            HERO_PARRAFO / HERO_CTA). Cambiar una punta sin la otra es
            cloaking. Sin señales de confianza: envíos y WhatsApp van solo en
            las tarjetas de `Confianza`, sin repetirse. */}
        <section
          data-seccion-home="hero"
          className="relative order-last w-full overflow-hidden md:order-none"
        >
          {/* Halo decorativo (mockup `.hero::before`). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-[120px] -top-[160px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgb(var(--color-secondary-container)/0.14),transparent_70%)]"
          />
          <div className="relative mx-auto w-full max-w-container-max px-margin-mobile pb-9 pt-10 md:px-margin-desktop md:pb-7 md:pt-11">
            <span
              style={revelado(0)}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-container-high px-3 py-[5px] font-label-sm text-[11px] font-bold uppercase leading-[14px] tracking-[0.08em] text-primary motion-safe:animate-fadeIn"
            >
              <i aria-hidden="true" className="block h-[7px] w-[7px] rounded-full bg-secondary" />
              Edición curada · Temporada 2026
            </span>

            <h1
              style={revelado(80)}
              className="mt-3.5 font-display-xl text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-primary motion-safe:animate-fadeIn md:max-w-[24ch] md:text-[48px] md:leading-[54px]"
            >
              Objetos singulares que transforman tu cotidiano.
            </h1>

            <p
              style={revelado(160)}
              className="mt-3 max-w-[60ch] font-body-md text-[16px] leading-[25px] text-on-surface-variant motion-safe:animate-fadeIn md:text-[17px] md:leading-[26px]"
            >
              Una selección táctil y funcional para el bienestar de la casa, la pausa y los
              rituales de todos los días. Cada pieza, elegida una por una.
            </p>

            {/* UN SOLO CTA: dos acciones al mismo destino no son jerarquía. */}
            <Link
              to="/coleccion"
              style={revelado(240)}
              className="group mt-[22px] inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-label-lg text-[14px] font-bold leading-none text-on-primary transition-colors motion-safe:animate-fadeIn hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Ver todo el catálogo
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[18px] transition-transform motion-safe:group-hover:translate-x-1"
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </section>

        {/* Buscador con sugerencias SOLO por debajo de `lg`: desde `lg` lo
            reemplaza el del header (`Navbar`, `hidden lg:block`). Los dos
            cortes son complementarios a propósito — con `md:hidden` acá, entre
            768 y 1023 px no habría ningún buscador con sugerencias. */}
        <div
          data-seccion-home="buscador"
          className="mx-auto mb-4 mt-1.5 w-full max-w-container-max px-margin-mobile md:px-margin-desktop lg:hidden"
        >
          <BuscadorSugerencias />
        </div>

        <div data-seccion-home="circulos">
          <CirculosCategoria />
        </div>
        <div data-seccion-home="promos">
          <PromosActivas
            promoDestacada={promoDestacada}
            ofertas={ofertas}
            errorOfertas={errorOfertas}
          />
        </div>
        <div data-seccion-home="vitrinas-campania">
          <VitrinasCampania vitrinas={vitrinasCampania} error={errorVitrinasCampania} />
        </div>
        <div data-seccion-home="mas-vendidos">
          <MasVendidos productos={masVendidos} error={errorMasVendidos} />
        </div>
        <div data-seccion-home="producto-icono">
          <ProductoIcono producto={productoIcono} />
        </div>
        <div data-seccion-home="nuevos-ingresos">
          <NuevosIngresos productos={nuevosIngresos} />
        </div>
        <div data-seccion-home="destacados">
          <CarruselDestacados productos={destacados} />
        </div>
        <div data-seccion-home="confianza">
          <Confianza />
        </div>
      </div>
    </>
  );
}

export default Catalogo;
