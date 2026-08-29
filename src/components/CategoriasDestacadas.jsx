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

        {/* `whitespace-nowrap` no es cosmético: "Ver productos" se partía en dos
            líneas en celular y el botón crecía a lo alto. Con el texto corto ya
            entra, pero el nowrap es lo que garantiza que un cambio de copy no
            reviva el problema en la pantalla más angosta. */}
        <Link
          to={rutaCategoria(categoria)}
          className="font-label-sm mt-4 whitespace-nowrap rounded-full border border-primary px-3 py-1.5 text-[11px] uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-on-primary sm:text-label-sm sm:px-4 sm:py-2"
        >
          Ver más
        </Link>
      </div>

      {/* La foto SOBRESALE de la card, y de ahí sale la sensación de relieve.
          Tres piezas la sostienen y sacar cualquiera la desarma:

          1. Sin fondo ni `overflow-hidden` ni `rounded-lg`. El recuadro crema
             delataba el recorte y encerraba la imagen; sin él, un PNG con alfa
             flota directamente sobre la card.
          2. La foto tiene que ser MÁS ALTA QUE LA CARD, y los márgenes
             negativos verticales lo bastante grandes como para que la card no
             crezca con ella. Es la parte contraintuitiva: los márgenes solos no
             alcanzan. Con la altura de la foto por debajo de la de la card, la
             card simplemente la contiene y no sobresale ni un píxel —medido, la
             primera versión daba exactamente 0—. La cuenta es
             `alto - 2 × margen ≤ alto del texto`, para que mande el texto.
          3. `z-10` para que, en la grilla de tres, la foto de una card nunca
             quede por debajo de la card vecina. */}
      <div className="relative z-10 -my-7 -mr-6 h-40 w-40 shrink-0 sm:-my-10 sm:-mr-8 sm:h-44 sm:w-44">
        {mostrarImagen ? (
          <img
            src={src}
            alt=""
            /* `drop-shadow` y NO `shadow`: el primero sigue el canal alfa y
               proyecta la silueta real del objeto; `box-shadow` dibujaría un
               rectángulo alrededor del `<img>` y volvería a marcar el recuadro
               que acabamos de sacar. Es la diferencia entre "objeto apoyado" y
               "foto pegada". */
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(29,27,26,0.20)]"
            loading="lazy"
            decoding="async"
            onError={() => setImagenRota(true)}
          />
        ) : (
          /* El placeholder NO sobresale ni proyecta sombra: no hay objeto que
             levantar, y un ícono flotando en el aire se lee como un error de
             carga en vez de como una categoría sin foto. */
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

        {/* `gap-6` y no `gap-4`: la foto SOBRESALE de su card (ver el comentario
            de la tarjeta), así que el hueco de la grilla dejó de ser aire y pasó
            a ser espacio que la foto ocupa. Con 16px no entraba — apiladas en
            celular, dos fotos consecutivas se comen 15 de esos 16 píxeles, y un
            nombre de categoría corto achica la card y las hace chocar. Si algún
            día crece el desborde de la foto, este gap crece con él. */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {categorias.map((categoria) => (
            <CardCategoria key={categoria.id} categoria={categoria} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoriasDestacadas;
