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
 */
function BotonVolver({ fallback = "/", puedeSalir }) {
  const volver = useVolver(fallback);

  function handleClick() {
    if (puedeSalir && !puedeSalir()) return;
    volver();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-label-md text-label-md -mx-2 inline-flex min-h-11 items-center gap-2 px-2 text-on-surface-variant hover:text-on-surface"
    >
      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
      Volver
    </button>
  );
}

export default BotonVolver;
