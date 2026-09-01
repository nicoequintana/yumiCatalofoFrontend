import { useEffect, useRef, useState } from "react";
import { formatPrecio, formatearPrecioInput } from "../utils/formato.js";

/**
 * Espera antes de avisarle al padre un cambio de precio. Mismo criterio (y
 * casi el mismo valor) que el debounce del buscador en `Coleccion.jsx`: los
 * campos de precio se escriben dígito a dígito, y sin esto cada tecla
 * empujaba el valor a la URL y disparaba su propio `GET /products` —
 * escribir "150000" salían seis requests, cinco de ellas descartadas al
 * llegar por el flag `activo` del efecto de fetch.
 */
const DEBOUNCE_PRECIO_MS = 350;

// Escala tipográfica del panel, achicada por pedido (29/08/2026): los rótulos
// van en mayúsculas con `tracking-widest`, que a 14px pesaban visualmente más
// que los propios campos.
//
// Los inputs quedan en 14px. Es por debajo de los 16px que evitan el
// auto-zoom de Safari en iOS al enfocar un campo — decisión consciente: el
// buscador de la barra ya está en 13px, y tener dos escalas distintas de
// input en la misma pantalla se ve peor que el zoom. Si el zoom molesta, se
// suben LOS DOS a 16px, nunca uno solo.
const CLASE_INPUT =
  "font-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-[14px] text-on-surface focus:border-primary focus:outline-none";

const CLASE_LABEL = "font-label-sm text-label-sm mb-1.5 block uppercase tracking-widest text-on-surface";

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
        value={formatearPrecioInput(valorLocal).formateado}
        onChange={(e) => setValorLocal(formatearPrecioInput(e.target.value).crudo)}
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
 * Sticky header for the public catalog (`Coleccion.jsx`): the page's `<h1>`,
 * a slim always-visible search box, and a "Filtros" button that drops an
 * overlay panel with categoría/precio. Purely controlled — all state (values
 * + change handlers) lives in the parent so it can stay in sync with the URL
 * querystring (`useSearchParams`) and drive the `getProducts()` refetch.
 *
 * Three decisions that look cosmetic and are not:
 *
 * 1. **El `<h1>` vive acá, no en la grilla.** Es lo que viaja pegado al
 *    navbar al scrollear: la barra sticky sin encabezado deja un botón
 *    suelto sin contexto sobre qué se está filtrando.
 *
 * 2. **El buscador queda SIEMPRE afuera del panel.** Buscar por nombre es la
 *    acción más frecuente del catálogo y tiene que costar un toque; los
 *    filtros de categoría/precio se usan mucho menos y pagan la apertura.
 *
 * 3. **El panel se mantiene MONTADO y se apaga con `inert`.** Desmontarlo al
 *    cerrar haría imposible animar la salida con CSS puro (no hay librería
 *    de animación en el proyecto y no se agrega una por esto). `inert` lo
 *    saca del tabulado y del árbol de accesibilidad, que es lo que un
 *    `display:none` daba gratis. Ojo con el gotcha ya documentado en
 *    CLAUDE.md: jsdom no implementa `inert`, así que los tests afirman sobre
 *    el atributo, no sobre la ausencia del nodo.
 *
 * El panel se pinta SOBRE la grilla (`absolute top-full`), nunca empujándola:
 * animar un alto automático se ve mal, y correr las cards hacia abajo mueve
 * justo lo que la persona está mirando.
 */
function FiltrosCatalogo({
  titulo,
  categorias,
  categoria,
  onChangeCategoria,
  search,
  onChangeSearch,
  minPrecio,
  onChangeMinPrecio,
  maxPrecio,
  onChangeMaxPrecio,
  onLimpiarFiltros,
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const contenedorRef = useRef(null);

  // Contador que se usa como `key` de los campos: incrementarlo los REMONTA.
  // Es lo que hace que "Limpiar" cancele un precio tipeado que todavía no
  // llegó a commitearse. Avisar `""` al padre no alcanza: si ese filtro ya
  // estaba vacío, la prop no cambia, `CampoPrecio` no se entera y su
  // temporizador pendiente commitea el valor viejo DESPUÉS de limpiar, con el
  // panel ya cerrado — un filtro apareciendo de la nada. Al remontar, el
  // cleanup del efecto hace el `clearTimeout`.
  const [generacionLimpieza, setGeneracionLimpieza] = useState(0);

  // La búsqueda libre NO entra en el contador: se ve sola en su propio input,
  // afuera del panel. Sumarla le atribuiría al botón un filtro que el panel
  // que abre no contiene.
  const cantidadFiltrosActivos = [categoria, minPrecio, maxPrecio].filter(Boolean).length;

  // Resumen de lo aplicado, visible SIN abrir el panel. Mismo alcance que el
  // contador del botón: la búsqueda libre no entra, porque ya se lee escrita
  // en su propio input y un chip sería el mismo dato dos veces en la misma
  // barra. Cada chip quita UN filtro — una sola escritura al router, así que
  // no sufre el pisoteo de actualizaciones que obligó a centralizar "Limpiar".
  const chips = [];
  if (categoria) {
    // `categorias` llega por fetch: entre el mount y su respuesta el id de la
    // URL no resuelve a ningún nombre. Se cae a una etiqueta genérica en vez
    // de imprimir `undefined`; el chip sigue siendo removible, que es lo que
    // realmente importa.
    const nombre = categorias.find((cat) => String(cat.id) === String(categoria))?.nombre;
    chips.push({ clave: "categoria", texto: nombre ?? "Categoría", quitar: () => onChangeCategoria("") });
  }
  if (minPrecio) {
    chips.push({ clave: "minPrecio", texto: `Desde ${formatPrecio(minPrecio)}`, quitar: () => onChangeMinPrecio("") });
  }
  if (maxPrecio) {
    chips.push({ clave: "maxPrecio", texto: `Hasta ${formatPrecio(maxPrecio)}`, quitar: () => onChangeMaxPrecio("") });
  }

  // Escape y click afuera cierran. Los listeners se registran sólo mientras
  // el panel está abierto: un panel cerrado no tiene nada que escuchar, y
  // dejarlos puestos hace que cada tecla de la página pase por acá.
  //
  // Es un *disclosure*, no un diálogo: por eso no usa `useDialogo` (trampa de
  // foco incluida). Atrapar el foco en un desplegable no modal impediría
  // seguir tabulando hacia la grilla, que es justamente lo que se está
  // filtrando y sigue visible atrás.
  useEffect(() => {
    if (!panelAbierto) return;

    function alPresionarTecla(evento) {
      if (evento.key === "Escape") setPanelAbierto(false);
    }

    function alClickearAfuera(evento) {
      if (!contenedorRef.current?.contains(evento.target)) setPanelAbierto(false);
    }

    document.addEventListener("keydown", alPresionarTecla);
    document.addEventListener("mousedown", alClickearAfuera);
    return () => {
      document.removeEventListener("keydown", alPresionarTecla);
      document.removeEventListener("mousedown", alClickearAfuera);
    };
  }, [panelAbierto]);

  // Los filtros se aplican EN VIVO: cada cambio ya viajó al padre (y de ahí a
  // la URL y al refetch) mientras se tocaba. "Aplicar" confirma y cierra — no
  // dispara el filtrado, porque no queda nada por disparar.
  //
  // Se descartó la alternativa (dejar los cambios en borrador y commitearlos
  // recién acá) por una razón concreta, no por gusto: cambiar la categoría
  // NAVEGA a `/coleccion/categoria/:slug`, que remonta la página y blanquea
  // los filtros heredados. Con commit diferido, cargar un precio y cambiar la
  // categoría en la misma tanda perdía el precio en silencio.
  function aplicar() {
    setPanelAbierto(false);
  }

  // Limpia SOLO los tres filtros del panel. La búsqueda libre queda afuera a
  // propósito: vive en su propio input, visible en la barra, y tampoco entra
  // en el contador de este botón — borrarla desde acá haría desaparecer texto
  // que la persona está mirando en otro control sin haberlo pedido.
  //
  // Delega en UNA sola operación del padre en vez de llamar a los tres
  // `onChange…`. No es prolijidad: cada handler escribe en el router, y
  // `setSearchParams` NO encola actualizaciones funcionales como `useState`
  // — las tres parten del mismo snapshot del render y gana la última, así que
  // de tres claves borradas se aplicaba una sola (y el `navigate` de la
  // categoría quedaba pisado encima). Verificado en el navegador: la URL
  // quedaba idéntica después de "Limpiar".
  function limpiar() {
    onLimpiarFiltros();
    setGeneracionLimpieza((prev) => prev + 1);
    setPanelAbierto(false);
  }

  return (
    // Fondo SÓLIDO, sin `/95` ni `backdrop-blur`: es el mismo
    // `surface-container-low` que la franja de «Volver» y la sección de la
    // grilla, así que toda la página debajo del navbar es una sola capa
    // continua. Con opacidad, este tramo se teñía apenas distinto del resto y
    // dejaba una costura horizontal visible bajo el título; el desenfoque
    // tampoco aportaba nada, porque lo que pasa por detrás es de ese color.
    // `top` suma una TERCERA punta al contrato de `navbar-height` (ver el
    // comentario del `<header>` en `Navbar.jsx`):
    // `calc(var(--alto-cinta-ambiente) + theme(spacing.navbar-height))`, no
    // `top-navbar-height` a secas. `--alto-cinta-ambiente` la declara
    // `CintaAmbiente.jsx` (ver `index.css`) y vale `0px` en producción, así
    // que ahí el cálculo da lo mismo que antes. En dev, el Navbar ya se corre
    // debajo de la cinta (ver `Navbar.jsx`), y esta barra tiene que sumar la
    // misma cinta a SU `top` para seguir pegada justo debajo del Navbar en
    // vez de quedar tapada por la cinta.
    <div
      ref={contenedorRef}
      className="sticky top-[calc(var(--alto-cinta-ambiente)_+_theme(spacing.navbar-height))] z-40 w-full border-b border-outline-variant bg-surface-container-low px-margin-mobile py-3 md:top-[calc(var(--alto-cinta-ambiente)_+_theme(spacing.navbar-height-md))] md:px-margin-desktop"
    >
      {/* UNA sola fila: buscador + botón. El buscador ocupa todo el sobrante y
          el botón nunca se encoge. */}
      <div className="mx-auto flex w-full max-w-container-max items-center gap-2 md:gap-3">
        {/* El título se mostraba acá y se sacó de la vista por pedido explícito
            (29/08/2026). Sigue en el DOM como `sr-only` a propósito: es el
            ÚNICO `<h1>` de `/coleccion` — el que estaba arriba de la grilla se
            eliminó al mudarlo a esta barra— y una página sin encabezado de
            nivel 1 pierde la señal más fuerte que tiene un buscador sobre de
            qué trata, además de dejar sin punto de entrada la navegación por
            encabezados de un lector de pantalla. Borrarlo del DOM es una
            regresión de SEO y de accesibilidad, no un ajuste visual. */}
        <h1 className="sr-only">{titulo}</h1>

        <div className="relative min-w-0 flex-1">
          <label htmlFor="filtro-search" className="sr-only">
            Buscar
          </label>
          <span
            aria-hidden="true"
            className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
          >
            search
          </span>
          <input
            id="filtro-search"
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="font-body-md h-9 w-full rounded-full border border-outline-variant/60 bg-surface-container-lowest pl-8 pr-3 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setPanelAbierto((prev) => !prev)}
          aria-expanded={panelAbierto}
          aria-controls="panel-filtros"
          className={`font-label-sm text-label-sm flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 uppercase tracking-widest shadow-ambient transition-colors ${
            panelAbierto || cantidadFiltrosActivos > 0
              ? "border-primary bg-primary text-on-primary"
              : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            tune
          </span>
          Filtros
          {cantidadFiltrosActivos > 0 ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-on-primary text-[10px] font-bold text-primary">
              {cantidadFiltrosActivos}
            </span>
          ) : null}
        </button>
      </div>

      {/* Segundo renglón: qué está filtrando la grilla ahora mismo, legible sin
          abrir el panel. Sólo existe cuando hay algo que mostrar — una barra
          vacía permanente le robaría alto a la barra sticky, que es
          justamente lo que esta pantalla vino a recuperar. */}
      {chips.length > 0 ? (
        <ul
          aria-label="Filtros aplicados"
          className="mx-auto mt-2 flex w-full max-w-container-max flex-wrap items-center gap-1.5"
        >
          {chips.map((chip) => (
            <li key={chip.clave}>
              <button
                type="button"
                onClick={chip.quitar}
                aria-label={`Quitar filtro: ${chip.texto}`}
                className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest py-1 pl-2.5 pr-1.5 text-[12px] text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                {chip.texto}
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  close
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* `absolute top-full`: el panel cuelga del borde inferior de la barra y
          se pinta sobre la grilla. El contenedor es `sticky`, que ya es un
          valor posicionado, así que oficia de bloque contenedor sin necesidad
          de un `relative` extra. */}
      <div
        id="panel-filtros"
        inert={!panelAbierto}
        className={`absolute inset-x-0 top-full origin-top border-b border-outline-variant bg-surface-container-lowest shadow-lg transition duration-200 ease-out motion-reduce:transition-none ${
          panelAbierto ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-4 md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CamposFiltro
              key={generacionLimpieza}
              categorias={categorias}
              categoria={categoria}
              onChangeCategoria={onChangeCategoria}
              minPrecio={minPrecio}
              onChangeMinPrecio={onChangeMinPrecio}
              maxPrecio={maxPrecio}
              onChangeMaxPrecio={onChangeMaxPrecio}
            />
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-outline-variant pt-4">
            <button
              type="button"
              onClick={limpiar}
              className="font-label-sm text-label-sm rounded-full border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={aplicar}
              className="font-label-sm text-label-sm rounded-full bg-primary px-5 py-2 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FiltrosCatalogo;
