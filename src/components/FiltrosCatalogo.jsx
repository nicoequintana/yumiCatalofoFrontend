const OPCIONES_DISPONIBILIDAD = [
  { value: "", label: "Todas" },
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "AGOTADO", label: "Agotado" },
  { value: "A_PEDIDO", label: "A pedido" },
];

const CLASE_INPUT =
  "font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none";

/**
 * Filter bar for the public catalog (`Catalogo.jsx`). Purely controlled —
 * all state (values + change handlers) lives in the parent so it can stay
 * in sync with the URL querystring (`useSearchParams`) and drive the
 * `getProducts()` refetch. Reuses the same Tailwind input/select classes as
 * `AdminProductoForm.jsx` for visual consistency across the app.
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
  disponibilidad,
  onChangeDisponibilidad,
}) {
  return (
    <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <label htmlFor="filtro-search" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
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

      <div>
        <label htmlFor="filtro-categoria" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
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

      <div>
        <label htmlFor="filtro-disponibilidad" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
          Disponibilidad
        </label>
        <select
          id="filtro-disponibilidad"
          value={disponibilidad}
          onChange={(e) => onChangeDisponibilidad(e.target.value)}
          className={CLASE_INPUT}
        >
          {OPCIONES_DISPONIBILIDAD.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filtro-precio-min" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
          Precio min.
        </label>
        <input
          id="filtro-precio-min"
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="0"
          value={minPrecio}
          onChange={(e) => onChangeMinPrecio(e.target.value)}
          className={CLASE_INPUT}
        />
      </div>

      <div>
        <label htmlFor="filtro-precio-max" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
          Precio máx.
        </label>
        <input
          id="filtro-precio-max"
          type="number"
          min="0"
          inputMode="decimal"
          placeholder="Sin límite"
          value={maxPrecio}
          onChange={(e) => onChangeMaxPrecio(e.target.value)}
          className={CLASE_INPUT}
        />
      </div>
    </div>
  );
}

export default FiltrosCatalogo;
