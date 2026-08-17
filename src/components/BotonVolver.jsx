import { useVolver } from "../hooks/useVolver.js";

/**
 * Reusable "go back" button, usado en todas las páginas internas que no
 * son la raíz del catálogo o del listado admin (design item 3).
 */
function BotonVolver({ className = "", fallback = "/" }) {
  const volver = useVolver(fallback);

  return (
    <button
      type="button"
      onClick={volver}
      className={`font-label-md text-label-md inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
      Volver
    </button>
  );
}

export default BotonVolver;
