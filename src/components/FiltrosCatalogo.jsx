import { useEffect, useRef, useState } from "react";
import { formatearPrecioFiltro } from "../utils/formato.js";

/**
 * Espera antes de avisarle al padre un cambio de precio. Mismo criterio (y
 * casi el mismo valor) que el debounce del buscador en `Coleccion.jsx`: los
 * campos de precio se escriben dígito a dígito, y sin esto cada tecla
 * empujaba el valor a la URL y disparaba su propio `GET /products` —
 * escribir "150000" salían seis requests, cinco de ellas descartadas al
 * llegar por el flag `activo` del efecto de fetch.
 */
const DEBOUNCE_PRECIO_MS = 350;

const CLASE_INPUT =
  "font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none";

const CLASE_LABEL = "font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface";

/**
 * Campo de precio con commit diferido. Lo que se ve se actualiza en el acto
 * (el input nunca se siente trabado); lo único que espera es el aviso al
 * padre, que es lo que termina en la URL y dispara el refetch.
 *
 * El padre sigue siendo la fuente de verdad — el valor vive en el
 * querystring. El estado local es solo el buffer de tipeo: `ultimoCommit`
 * guarda el último valor que este campo emitió o adoptó, y comparar contra él
 * es lo que distingue "el usuario está escribiendo" de "el padre cambió el
 * valor por su cuenta" (reseteo de filtros, navegación con params). Sin esa
 * distinción, cada valor que baja por props rebotaría de vuelta hacia arriba.
 */
function CampoPrecio({ id, label, placeholder, valor, onChange }) {
  const [valorLocal, setValorLocal] = useState(valor);
  const ultimoCommit = useRef(valor);

  // `onChange` llega como arrow inline desde `Coleccion.jsx`, así que es una
  // función nueva en cada render del padre. Guardarla en un ref evita que el
  // efecto del temporizador se reinicie en cada render y termine no
  // disparando nunca mientras el padre se re-renderiza.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (valor === ultimoCommit.current) return;
    ultimoCommit.current = valor;
    setValorLocal(valor);
  }, [valor]);

  useEffect(() => {
    if (valorLocal === ultimoCommit.current) return;

    const timeoutId = setTimeout(() => {
      ultimoCommit.current = valorLocal;
      onChangeRef.current(valorLocal);
    }, DEBOUNCE_PRECIO_MS);

    return () => clearTimeout(timeoutId);
  }, [valorLocal]);

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
        value={formatearPrecioFiltro(valorLocal).formateado}
        onChange={(e) => setValorLocal(formatearPrecioFiltro(e.target.value).crudo)}
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
