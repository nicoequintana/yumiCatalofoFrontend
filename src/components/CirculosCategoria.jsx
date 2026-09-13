import { Link } from "react-router-dom";
import { useCategoriasHome } from "../hooks/useCategoriasNavbar.js";
import { rutaCategoria } from "../utils/slug.js";
import { colorParaSlug } from "../utils/paletaCategoria.js";

/**
 * El ícono cuando la categoría no tiene `icono` propio cargado en el panel.
 * Es UNO SOLO para todas las categorías sin ícono: no hay nada que elegir por
 * categoría en ese caso, así que vive en una constante con nombre en vez de
 * repetirse en cada rama que cae a él.
 */
const ICONO_GENERICO = "category";

/**
 * Los accesos por categoría de la home, como una fila de círculos que se
 * desliza.
 *
 * REEMPLAZA a `CategoriasDestacadas`, que mostraba TRES tarjetas grandes en
 * 638 px y dejaba cinco categorías con productos publicados sin ninguna puerta
 * de entrada desde la home — una de ellas, Tecnología, es la cuarta más grande
 * del catálogo.
 *
 * **Ícono sobre color, no foto — y esto REVIERTE la decisión del 06/09/2026
 * (ver "El círculo muestra la foto", `docs/reglas/catalogo-publico.md`) con un
 * argumento nuevo, no el mismo que se refutó el 05/09.** Cada círculo muestra
 * `Categoria.icono` (Material Symbols, se elige en el panel) sobre un degradé
 * PASTEL de una familia elegida de forma DETERMINÍSTICA por slug
 * (`utils/paletaCategoria.js`) — presentación pura, no viaja por la API. Sin
 * ícono cargado cae al mismo `ICONO_GENERICO` de siempre: no hay nada que
 * elegir por categoría en ese caso, así que una categoría recién creada nunca
 * rompe la fila.
 *
 * **El ícono va en un tono OSCURO de la MISMA familia que el fondo, nunca
 * blanco sobre un color saturado.** Es el look del mockup aprobado (disco
 * pastel + ícono oscuro del mismo matiz) y además es lo que sostiene el
 * contraste: `tokens.test.js` prueba WCAG 1.4.11 (3:1) para las dos paradas
 * del degradé de cada familia.
 *
 * **El anillo es un doble `box-shadow`, no un `border`**: una separación fina
 * del color de superficie y después el aro de color — mismo mecanismo que el
 * mockup (`0 0 0 2px var(--surface), 0 0 0 3.5px var(--outline-var)`), para
 * que el aro se lea flotando sobre el fondo de la sección en vez de pegado al
 * borde del disco. `destacadaEnHome` sigue decidiendo el color del aro
 * (`primary` destacada, `outline-variant` el resto) — mismo criterio de
 * siempre, solo cambió CÓMO se pinta.
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

/** UN círculo. */
function CirculoCategoria({ categoria }) {
  // Determinístico por slug (no por id ni nombre crudo): dos categorías con
  // el mismo nombre en ambientes distintos caen en la misma familia, y es la
  // misma clave que ya identifica la categoría en la URL.
  const familia = colorParaSlug(rutaCategoria(categoria) ?? categoria.nombre);
  const colorAnillo = categoria.destacadaEnHome ? "var(--color-primary)" : "var(--color-outline-variant)";

  return (
    <Link
      to={rutaCategoria(categoria)}
      className="flex w-16 flex-col items-center gap-1.5 text-center md:w-20"
    >
      <span
        data-testid="fondo-circulo"
        style={{
          background: `radial-gradient(120% 90% at 30% 20%, rgb(var(--circulo-${familia}-claro)), rgb(var(--circulo-${familia}-profundo)))`,
          // Doble aro: separación de superficie + color, igual que el mockup —
          // NUNCA un `border` pegado al disco.
          boxShadow: `0 0 0 2px rgb(var(--color-surface)), 0 0 0 3.5px rgb(${colorAnillo})`,
        }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full md:h-16 md:w-16"
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[28px] md:text-[32px]"
          style={{ color: `rgb(var(--circulo-${familia}-icono))` }}
        >
          {categoria.icono || ICONO_GENERICO}
        </span>
      </span>
      <span className="font-label-sm text-label-sm leading-tight text-on-surface-variant">
        {categoria.nombre}
      </span>
    </Link>
  );
}

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
            <CirculoCategoria categoria={categoria} />
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
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest shadow-ambient md:h-16 md:w-16">
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
