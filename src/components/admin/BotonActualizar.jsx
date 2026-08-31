import Spinner from "../Spinner.jsx";

/**
 * Vuelve a pedir los datos de la pantalla, sin recargar la página.
 *
 * **Existe por lo que NO hace, no por lo que hace.** F5 también trae los datos
 * nuevos; lo que este botón agrega es conservar el estado de la pantalla — la
 * página, el orden, el filtro, la búsqueda, el scroll. En una tabla de 84
 * productos donde el admin está en la página 3 con una categoría filtrada,
 * recargar cuesta reconstruir todo eso a mano.
 *
 * Va SOLO en las pantallas donde el dato cambia por afuera: Órdenes (entran
 * pedidos mientras se mira), Productos y Costos y precios (la skill de alta
 * desde MercadoLibre escribe por API), Logs y Métricas. En Categorías, Usuarios
 * y Anuncios los cambios los hace una persona desde esa misma pantalla y la
 * grilla ya se recarga sola, así que ahí el botón sería un control de más.
 *
 * **Es solo ícono, cuadrado.** Va en barras donde el resto son acciones con
 * texto que navegan a otra pantalla ("Importar", "Costos y precios", "Agregar
 * producto"); refrescar es de otra naturaleza —no lleva a ningún lado— y el
 * cuadrado lo separa de esa fila sin necesidad de un divisor. De paso deja de
 * competir por el ancho en la barra más cargada, que es la de Productos.
 *
 * ⚠️ **Sin texto visible, `aria-label` deja de ser prolijidad y pasa a ser lo
 * único que identifica al botón**: sin él un lector de pantalla anuncia "botón"
 * y nada más. El `title` cubre el otro lado — quien ve el ícono y no lo
 * reconoce necesita el hover.
 *
 * Presentacional puro: no sabe de qué pantalla cuelga ni cómo se traen los
 * datos. El padre decide qué refrescar y le pasa `actualizando`.
 *
 * @param {() => void} onActualizar
 * @param {boolean} [actualizando] hay un pedido en vuelo
 * @param {string} [etiqueta] el NOMBRE ACCESIBLE (y el tooltip), no texto visible.
 *   Se cambia donde "Actualizar" sería ambiguo: en Costos y precios ya hay un
 *   "Actualizar precios" que publica al catálogo, y el que se toca por error no
 *   puede ser ese.
 * @param {string} [className]
 */
function BotonActualizar({ onActualizar, actualizando = false, etiqueta = "Actualizar", className = "" }) {
  const nombre = actualizando ? "Actualizando…" : etiqueta;

  return (
    <button
      type="button"
      onClick={onActualizar}
      // Sin esto el botón se clickea tres veces: cada click dispara otro pedido
      // y las respuestas llegan en cualquier orden.
      disabled={actualizando}
      aria-label={nombre}
      title={nombre}
      // `size-[42px]` fijo y no un padding que se adapte: el spinner mide menos
      // que el ícono, así que con el tamaño derivado del contenido el botón se
      // encogería un par de píxeles al empezar a actualizar y la barra entera
      // daría un salto. 42px es lo que miden los botones de texto de al lado
      // (`py-3` + 18px de ícono), para que la fila quede alineada.
      className={`inline-flex size-[42px] shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:border-outline disabled:opacity-60 ${className}`}
    >
      {actualizando ? (
        // El spinner va `aria-hidden`: trae su propio `aria-label="Cargando"`
        // con `role="status"`, y adentro de un botón ese texto se concatena al
        // nombre accesible — quedaba "CargandoActualizar". El estado ya lo dice
        // el `aria-label` de arriba; acá el spinner es puramente visual.
        <span aria-hidden="true" className="inline-flex">
          <Spinner className="h-[18px] w-[18px] text-on-surface-variant" />
        </span>
      ) : (
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          refresh
        </span>
      )}
    </button>
  );
}

export default BotonActualizar;
