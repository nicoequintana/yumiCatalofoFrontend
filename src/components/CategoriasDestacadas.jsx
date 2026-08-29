import { useState } from "react";
import { Link } from "react-router-dom";
import useCategoriasDestacadas from "../hooks/useCategoriasDestacadas.js";
import { rutaCategoria } from "../utils/slug.js";

/**
 * Una card: nombre de la categoría, un gancho corto, la foto y el CTA que
 * lleva al catálogo ya filtrado por esa categoría.
 *
 * El destino se arma con `rutaCategoria`, nunca con un template literal a
 * mano: es la misma función que produce el `<loc>` del sitemap y el canonical
 * de la página de categoría, y armarlo por separado es exactamente lo que
 * rompe esa invariante (ver "SEO, Open Graph y crawlers" en CLAUDE.md).
 *
 * La foto es decorativa (`alt=""`): el `<h3>` de al lado ya nombra la
 * categoría, así que describirla otra vez sólo agrega ruido en un lector de
 * pantalla.
 */
function CardCategoria({ categoria }) {
  const [imagenRota, setImagenRota] = useState(false);
  const src = categoria.imagenUrl;

  // Dos formas distintas de "no hay foto", con el mismo desenlace: la categoría
  // todavía no tiene una cargada desde el panel, o la tiene pero el archivo ya
  // no está en Cloudinary. La segunda sólo se descubre en runtime, de ahí el
  // `onError` — sin él esa rama termina en el ícono de imagen rota.
  const mostrarImagen = Boolean(src) && !imagenRota;

  return (
    <article className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-lg">
      <div className="flex min-w-0 flex-col items-start">
        <h3 className="font-headline-md text-[20px] text-on-surface">{categoria.nombre}</h3>
        <p className="font-body-md mt-1 text-[14px] text-on-surface-variant">Conocé más!</p>

        <Link
          to={rutaCategoria(categoria)}
          className="font-label-sm text-label-sm mt-4 rounded-full border border-primary px-4 py-2 uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-on-primary"
        >
          Ver productos
        </Link>
      </div>

      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-container-low sm:h-28 sm:w-28">
        {mostrarImagen ? (
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setImagenRota(true)}
          />
        ) : (
          <span
            aria-hidden="true"
            className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[40px] text-on-surface-variant opacity-40"
          >
            category
          </span>
        )}
      </div>
    </article>
  );
}

/**
 * Sección "Explorá por categoría" de la home: hasta tres cards que llevan al
 * catálogo ya filtrado. Qué categorías aparecen, en qué orden y con qué foto
 * lo decide el panel (Configuración › Categorías), no un cálculo.
 *
 * Se oculta entera cuando el panel no marcó ninguna categoría
 * — mismo criterio que el carrusel de destacados. Una sección con el título
 * puesto y cero cards se lee como un error de carga; no renderizar nada se
 * lee como que todavía no hay nada que ofrecer, que es la verdad.
 */
function CategoriasDestacadas() {
  const { categorias } = useCategoriasDestacadas();

  if (categorias.length === 0) return null;

  return (
    <section className="w-full bg-surface-container-low px-margin-mobile py-12 md:px-margin-desktop md:py-16">
      <div className="mx-auto w-full max-w-container-max">
        <h2 className="font-headline-lg text-headline-lg-mobile text-on-background lg:text-headline-lg">
          Explorá por categoría
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {categorias.map((categoria) => (
            <CardCategoria key={categoria.id} categoria={categoria} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoriasDestacadas;
