import { useNavigate } from "react-router-dom";

/**
 * Reusable "go back" button — navigate(-1), used on every internal page
 * that isn't the catalog root or the admin list root (design item 3).
 */
function BotonVolver({ className = "" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`font-label-md text-label-md inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
      Volver
    </button>
  );
}

export default BotonVolver;
