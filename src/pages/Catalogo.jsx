import { Link } from "react-router-dom";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import BentoDestacados from "../components/BentoDestacados.jsx";
import useDestacados from "../hooks/useDestacados.js";
import heroImg from "../assets/hero.jpg";

/**
 * `/` — home editorial, per design doc
 * 2026-08-19-separacion-home-coleccion.md.
 *
 * Esta página es la vidriera de marca: Hero + bento de destacados +
 * manifiesto. El catálogo completo con filtros vive ahora en `/coleccion`
 * (`Coleccion.jsx`) — antes ambas cosas compartían un solo scroll acá, lo
 * que mezclaba dos trabajos distintos (enganchar vs. buscar) e impedía
 * compartir un link de productos filtrados sin arrastrar todo el contenido
 * editorial.
 */
function Catalogo() {
  const { productos: destacados } = useDestacados();

  return (
    <>
      {/* Hero Section — layout asimétrico per design doc
          2026-08-19-catalogo-publico-editorial-design.md */}
      <section className="w-full px-margin-mobile pb-16 pt-12 md:px-margin-desktop md:pb-24 md:pt-16">
        <div className="mx-auto grid w-full max-w-container-max grid-cols-1 items-center gap-gutter md:grid-cols-12">
          <div className="z-10 flex flex-col gap-6 md:col-span-5">
            <span className="font-label-md text-label-md w-max rounded-full bg-tertiary-container px-3 py-1 uppercase tracking-wide text-on-tertiary-container">
              La Pregunta del Día
            </span>
            <h1 className="font-display-lg text-display-lg tracking-tight text-on-surface">
              ¿Qué vas a descubrir hoy?
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Entrá por una cosa. Quedate por muchas.
              <br />
              Encontrá eso que buscabas y algo que no sabías que querías.
            </p>
            <Link
              to="/coleccion"
              className="mt-4 w-max rounded-lg bg-primary px-6 py-3 font-label-md text-label-md text-on-primary shadow-sm shadow-primary/20 transition-colors hover:bg-primary-container"
            >
              Explorar Colección
            </Link>
          </div>

          <div className="relative mt-8 md:col-span-7 md:mt-0">
            <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 transform rounded-xl bg-surface-container-high" />
            <img
              className="h-[500px] w-full rounded-xl object-cover shadow-lg shadow-primary/5"
              src={heroImg}
              alt="Selección destacada del catálogo YIMA"
            />
          </div>
        </div>
      </section>

      <BentoDestacados productos={destacados} />

      {/* Manifiesto de marca — cierre editorial antes del footer.
          Sin botón CTA: no existe una página "Sobre nosotros" en el
          proyecto (ver design doc 2026-08-19), un link ahí sería un enlace
          roto o alcance nuevo fuera de esta spec. */}
      <section className="relative w-full overflow-hidden bg-cream-base px-margin-mobile py-32 md:px-margin-desktop">
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <span className="material-symbols-outlined text-4xl text-moss-green opacity-50">
            auto_awesome
          </span>
          <h2 className="font-headline-lg text-headline-lg italic text-on-surface">
            El Manifiesto YIMA
          </h2>
          <p className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            No vendemos productos: elegimos piezas que valen la pena tener cerca.
            Cada cosa que entra al catálogo pasó antes por la misma pregunta que
            te hacemos a vos — ¿esto suma o solo ocupa lugar? Encontrá lo que
            buscabas, y de paso, algo que no sabías que te hacía falta.
          </p>
        </div>
        <div className="absolute -z-0 left-10 top-10 h-64 w-64 rounded-full bg-terracotta-warm/5 blur-3xl" />
        <div className="absolute -z-0 bottom-10 right-10 h-96 w-96 rounded-full bg-golden-sand/10 blur-3xl" />
      </section>

      <BotonWhatsapp contexto={{ tipo: "home" }} />
    </>
  );
}

export default Catalogo;
