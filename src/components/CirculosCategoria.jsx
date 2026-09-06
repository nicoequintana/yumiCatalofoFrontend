import { Link } from "react-router-dom";
import { useCategoriasHome } from "../hooks/useCategoriasNavbar.js";
import { rutaCategoria } from "../utils/slug.js";

/**
 * Los accesos por categoría de la home, como una fila de círculos que se
 * desliza.
 *
 * REEMPLAZA a `CategoriasDestacadas`, que mostraba TRES tarjetas grandes en
 * 638 px y dejaba cinco categorías con productos publicados sin ninguna puerta
 * de entrada desde la home — una de ellas, Tecnología, es la cuarta más grande
 * del catálogo.
 *
 * **Ícono, no foto.** A 56 px una foto de producto es un recorte
 * irreconocible; los círculos de los marketplaces son íconos planos por lo
 * mismo. Sin ícono cae a la inicial, así que una categoría recién creada nunca
 * rompe la fila.
 *
 * La última tarjeta cortada al borde derecho es la señal de "hay más": no hace
 * falta ningún texto que lo diga.
 *
 * **"Ver todas" cierra la fila.** Sin ella no había ningún acceso al catálogo
 * completo desde acá — cada círculo llevaba a UNA categoría, nunca a todas.
 * Va al final, después de las categorías reales, con el mismo tratamiento
 * visual que un círculo sin destacar: es la salida del recorrido, no un
 * atajo antes de él.
 */
export default function CirculosCategoria() {
  const { categorias } = useCategoriasHome();

  // Falla blanda, igual que el navbar: sin categorías el sitio sigue llevando a
  // `/coleccion` desde el hero y desde la navegación.
  if (categorias.length === 0) return null;

  return (
    <nav
      aria-label="Categorías"
      className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* `mx-auto` con `w-max`: cuando las categorías entran holgadas —que es
          el caso en escritorio— la fila queda centrada bajo el carrusel en vez
          de arrancar pegada al margen izquierdo. Y cuando NO entran, `w-max`
          supera el ancho del contenedor, los márgenes automáticos se resuelven
          en cero, y la fila vuelve a scrollear normalmente sin perder ninguna
          categoría por la izquierda. */}
      <ul className="mx-auto flex w-max gap-4 px-margin-mobile py-8 md:gap-6 md:px-margin-desktop">
        {categorias.map((categoria) => (
          <li key={categoria.id}>
            <Link
              to={rutaCategoria(categoria)}
              className="flex w-16 flex-col items-center gap-1.5 text-center md:w-20"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full border bg-surface-container-lowest md:h-16 md:w-16 ${
                  categoria.destacadaEnHome ? "border-primary" : "border-outline-variant"
                }`}
              >
                {categoria.icono ? (
                  <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-primary">
                    {categoria.icono}
                  </span>
                ) : (
                  /* Sin ícono, la inicial. Una categoría recién creada entra a
                     la fila igual, sin que nadie tenga que cargar nada. */
                  <span aria-hidden="true" className="font-headline-sm text-headline-sm text-primary">
                    {categoria.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="font-label-sm text-label-sm leading-tight text-on-surface-variant">
                {categoria.nombre}
              </span>
            </Link>
          </li>
        ))}
        {/* Acceso al catálogo completo, al final de la fila. Mismo tamaño y
            mismo borde que un círculo sin destacar (`border-outline-variant`):
            tiene que leerse como parte del recorrido, no como un agregado
            aparte. El nombre accesible sale del texto visible "Ver todas", no
            del ícono, que va `aria-hidden` como el resto de los íconos de acá. */}
        <li>
          <Link
            to="/coleccion"
            className="flex w-16 flex-col items-center gap-1.5 text-center md:w-20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest md:h-16 md:w-16">
              <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-primary">
                grid_view
              </span>
            </span>
            <span className="font-label-sm text-label-sm leading-tight text-on-surface-variant">
              Ver todas
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
