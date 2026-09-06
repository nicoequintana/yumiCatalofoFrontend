import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategoriasHome } from "../hooks/useCategoriasNavbar.js";
import { rutaCategoria } from "../utils/slug.js";

/**
 * El ícono cuando la categoría no tiene foto propia, o la tuvo y dejó de
 * resolver. Es UNO SOLO para todas las categorías sin foto — a diferencia del
 * selector de íconos que existía antes, acá no hay nada que elegir por
 * categoría, así que vive en una constante con nombre en vez de repetirse en
 * cada rama que cae a él.
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
 * **Foto, no ícono.** Cada círculo muestra la foto de la categoría
 * (`imagenUrl`) recortada al círculo. Sin foto —o si la que tenía dejó de
 * resolver— cae al mismo `ICONO_GENERICO` para todas: no hay ícono por
 * categoría que cargar, así que una categoría recién creada nunca rompe la
 * fila.
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

/**
 * UN círculo. Necesita su propio estado de "la foto se rompió": con el
 * `useState` en el componente padre, el error de una categoría marcaría rota
 * la foto de todas — cada círculo tiene su Cloudinary propio y puede fallar
 * solo.
 */
function CirculoCategoria({ categoria }) {
  // Una foto que ya no está en Cloudinary sólo se descubre en runtime — mismo
  // patrón que `SlideCampania`: sin el `onError` quedaría el ícono roto del
  // navegador en vez de caer al genérico.
  const [fotoRota, setFotoRota] = useState(false);
  const hayFoto = Boolean(categoria.imagenUrl) && !fotoRota;

  return (
    <Link
      to={rutaCategoria(categoria)}
      className="flex w-16 flex-col items-center gap-1.5 text-center md:w-20"
    >
      <span
        className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-surface-container-lowest md:h-16 md:w-16 ${
          categoria.destacadaEnHome ? "border-primary" : "border-outline-variant"
        }`}
      >
        {hayFoto ? (
          // `absolute inset-0`, NUNCA `h-full w-full` en flujo normal: la caja
          // es un círculo de tamaño fijo, no un `aspect-*`, pero el mismo
          // problema aplica — un `<img>` en flujo normal no llena la caja,
          // así que se posiciona y se recorta con `object-cover`.
          <img
            src={categoria.imagenUrl}
            alt=""
            onError={() => setFotoRota(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          /* Sin foto —o rota—, el ícono genérico. Ídem para todas: no hay
             nada que elegir por categoría. */
          <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-primary">
            {ICONO_GENERICO}
          </span>
        )}
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
