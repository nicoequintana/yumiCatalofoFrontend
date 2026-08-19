import { useState } from "react";
import { formatearPrecioFiltro } from "../utils/formato.js";

const CLASE_INPUT =
  "font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none";

const CLASE_LABEL = "font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface";

function CampoPrecio({ id, label, placeholder, valor, onChange }) {
  return (
    <div>
      <label htmlFor={id} className={CLASE_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={formatearPrecioFiltro(valor).formateado}
        onChange={(e) => onChange(formatearPrecioFiltro(e.target.value).crudo)}
        className={CLASE_INPUT}
      />
    </div>
  );
}

function CamposFiltro({ categorias, categoria, onChangeCategoria, minPrecio, onChangeMinPrecio, maxPrecio, onChangeMaxPrecio }) {
  return (
    <>
      <div>
        <label htmlFor="filtro-categoria" className={CLASE_LABEL}>
          Categoría
        </label>
        <select
          id="filtro-categoria"
          value={categoria}
          onChange={(e) => onChangeCategoria(e.target.value)}
          className={CLASE_INPUT}
        >
          <option value="">Todas</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <CampoPrecio
        id="filtro-precio-min"
        label="Precio min."
        placeholder="0"
        valor={minPrecio}
        onChange={onChangeMinPrecio}
      />

      <CampoPrecio
        id="filtro-precio-max"
        label="Precio máx."
        placeholder="Sin límite"
        valor={maxPrecio}
        onChange={onChangeMaxPrecio}
      />
    </>
  );
}

/**
 * Sticky filter bar for the public catalog (`Coleccion.jsx`), pinned right
 * below the (also sticky) `Navbar`. Purely controlled — all state (values +
 * change handlers) lives in the parent so it can stay in sync with the URL
 * querystring (`useSearchParams`) and drive the `getProducts()` refetch.
 *
 * Desktop (`md+`): every field renders inline in the sticky strip — zero
 * clicks to filter, matching how Mercado Libre's desktop catalog keeps
 * filters always visible. Mobile: only the search input + a "Filtros" toggle
 * render in the strip; tapping it drops down a panel with categoría/precio
 * (Mercado Libre's mobile pattern — a full modal would hide the results grid
 * entirely, a mobile drop-down panel doesn't).
 */
function FiltrosCatalogo({
  categorias,
  categoria,
  onChangeCategoria,
  search,
  onChangeSearch,
  minPrecio,
  onChangeMinPrecio,
  maxPrecio,
  onChangeMaxPrecio,
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const cantidadFiltrosActivos = [categoria, minPrecio, maxPrecio].filter(Boolean).length;

  return (
    <div className="sticky top-navbar-height z-40 w-full border-b border-outline-variant bg-surface-container-low/95 px-margin-mobile py-4 backdrop-blur md:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-container-max items-center gap-4">
        <div className="flex-1">
          <label htmlFor="filtro-search" className="sr-only">
            Buscar
          </label>
          <input
            id="filtro-search"
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            className={CLASE_INPUT}
          />
        </div>

        {/* Desktop: campos siempre visibles inline, cada uno con ancho fijo
            para que la tira no salte de tamaño al tipear. */}
        <div className="hidden shrink-0 gap-4 md:flex [&>div]:w-36">
          <CamposFiltro
            categorias={categorias}
            categoria={categoria}
            onChangeCategoria={onChangeCategoria}
            minPrecio={minPrecio}
            onChangeMinPrecio={onChangeMinPrecio}
            maxPrecio={maxPrecio}
            onChangeMaxPrecio={onChangeMaxPrecio}
          />
        </div>

        {/* Mobile: botón que despliega el panel con categoría/precio. */}
        <button
          type="button"
          onClick={() => setPanelAbierto((prev) => !prev)}
          aria-expanded={panelAbierto}
          className="font-label-md text-label-md flex shrink-0 items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface md:hidden"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          Filtros
          {cantidadFiltrosActivos > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] text-on-primary">
              {cantidadFiltrosActivos}
            </span>
          ) : null}
        </button>
      </div>

      {panelAbierto ? (
        <div className="mx-auto grid w-full max-w-container-max grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:hidden">
          <CamposFiltro
            categorias={categorias}
            categoria={categoria}
            onChangeCategoria={onChangeCategoria}
            minPrecio={minPrecio}
            onChangeMinPrecio={onChangeMinPrecio}
            maxPrecio={maxPrecio}
            onChangeMaxPrecio={onChangeMaxPrecio}
          />
        </div>
      ) : null}
    </div>
  );
}

export default FiltrosCatalogo;
