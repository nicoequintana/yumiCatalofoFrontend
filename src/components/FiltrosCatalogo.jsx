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
 *
 * `disponibilidad`/`onChangeDisponibilidad`: kept as real, accepted props —
 * `Catalogo.jsx` still passes them — but the field they used to control no
 * longer renders here (see below), matching `Badge.jsx`'s dead-by-design
 * pattern for the same product decision: no real stock-management workflow
 * exists yet, so `disponibilidad` must not be a usable public filter.
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
  // `disponibilidad`/`onChangeDisponibilidad` intentionally unused below —
  // accepted as props only so `Catalogo.jsx` doesn't need to change.
  void disponibilidad;
  void onChangeDisponibilidad;

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

      {/* Disponibilidad field intentionally not rendered — see doc comment
          above. `OPCIONES_DISPONIBILIDAD` stays defined so this block can be
          restored verbatim once a real stock-management workflow exists. */}

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
