import { useNavigate } from "react-router-dom";
import { useVolver } from "../hooks/useVolver.js";

/**
 * Reusable "go back" button, usado en todas las páginas internas que no
 * son la raíz del catálogo o del listado admin (design item 3).
 *
 * `min-h-11` (44px) garantiza un área táctil accesible: el texto por sí solo
 * mide ~18px de alto, muy por debajo del mínimo recomendado para targets
 * táctiles en mobile. El `-mx-2`/`px-2` amplía el área clickeable sin
 * desalinear el texto respecto del contenido de la página.
 *
 * `puedeSalir` es un gancho opcional para pantallas con trabajo sin guardar
 * (el editor de producto): si devuelve `false`, la navegación se cancela.
 * Omitido, el botón se comporta como siempre.
 *
 * `destinoFijo` cambia la SEMÁNTICA, no el destino: por defecto el botón
 * vuelve por el HISTORIAL, que es lo correcto en el catálogo público —quien
 * llega a una ficha desde una búsqueda quiere volver a la búsqueda—, y con
 * `destinoFijo` va siempre al `fallback`.
 *
 * Un EDITOR necesita lo segundo. Es un destino al que se entra a hacer una
 * tarea y del que se sale a un lugar conocido: si entraste desde Productos y
 * el encabezado dice que estás editando una campaña, un "Volver" que te
 * devuelve a Productos contradice lo que la pantalla dice de sí misma.
 *
 * `etiqueta` existe para el mismo par: cuando el destino es fijo conviene
 * nombrarlo ("Volver al calendario"), así el botón no promete una cosa y hace
 * otra.
 */
function BotonVolver({ fallback = "/", puedeSalir, destinoFijo = false, etiqueta = "Volver" }) {
  const navigate = useNavigate();
  const volverPorHistorial = useVolver(fallback);

  function handleClick() {
    if (puedeSalir && !puedeSalir()) return;
    if (destinoFijo) {
      navigate(fallback);
      return;
    }
    volverPorHistorial();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-label-md text-label-md -mx-2 inline-flex min-h-11 items-center gap-2 px-2 text-on-surface-variant hover:text-on-surface"
    >
      {/* `aria-hidden`: sin esto el ligature del ícono entra en el nombre
          accesible y un lector de pantalla anuncia "arrow_back Volver". */}
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
        arrow_back
      </span>
      {etiqueta}
    </button>
  );
}

export default BotonVolver;
