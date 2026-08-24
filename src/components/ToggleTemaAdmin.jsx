import useTemaAdmin from "../hooks/useTemaAdmin.js";

/**
 * Dark-mode switch for the admin panel. Rendered inside AdminSidebar in both
 * of its layouts, which is why it takes a `compacto` prop: the desktop bottom
 * nav has no room for the text label and shows the icon alone, while the
 * mobile sidebar shows icon + label like every other entry. The accessible
 * name stays the same in both cases, so the icon-only variant is still
 * announced correctly by screen readers.
 *
 * `role="switch"` + `aria-checked` rather than a plain button: this toggles a
 * persistent on/off setting, not a one-shot action.
 */
function ToggleTemaAdmin({ compacto = false }) {
  const { esOscuro, alternarTema } = useTemaAdmin();

  const etiqueta = esOscuro ? "Desactivar modo oscuro" : "Activar modo oscuro";

  const base = compacto
    ? "flex flex-col items-center gap-1 rounded-lg px-3 py-2 font-label-sm text-label-sm transition-colors"
    : "flex w-full items-center gap-3 rounded-lg px-4 py-3 font-label-md text-label-md uppercase tracking-widest transition-colors";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={esOscuro}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={alternarTema}
      className={`${base} text-on-surface-variant hover:bg-surface-container hover:text-on-surface`}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {esOscuro ? "light_mode" : "dark_mode"}
      </span>
      {!compacto && <span>Modo oscuro</span>}
    </button>
  );
}

export default ToggleTemaAdmin;
