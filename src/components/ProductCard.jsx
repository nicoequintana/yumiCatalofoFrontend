import { Link } from "react-router-dom";
import BotonAgregar from "./BotonAgregar.jsx";
import BotonFavorito from "./BotonFavorito.jsx";
import { rutaProducto } from "../utils/slug.js";
import PrecioProducto from "./PrecioProducto.jsx";

/**
 * Single card component for the public product grids (`/coleccion`,
 * `/favoritos`, and the related-products strip in `FichaProducto`).
 *
 * Marketplace-grid layout (Mercado Libre reference): square image tile,
 * floating favorite heart, an etiqueta chip anchored to the image's bottom
 * edge, then a compact text block (categoria eyebrow, 1-line truncated
 * nombre, precio). Two columns on mobile, like the reference app — one
 * column per row made a single card fill almost the whole screen.
 *
 * The card is stacked-only on purpose. A `variant: "horizontal"` used to
 * render a wide card on every 4th grid slot, which mixed two card shapes in
 * the same grid and read as broken rather than editorial. Every consumer now
 * lays the card out on a uniform grid, so the card owns its own vertical
 * shape and the parent page only owns the column count.
 */
function ProductCard({ producto }) {
  const foto = producto.fotos?.[0];
  const href = rutaProducto(producto);

  // Sin anillo para los destacados: el mockup no lo tiene, y la sombra usaba
  // un rgba fijo de la marca vieja. Al destacado lo señala su chip.
  const shell =
    "bg-surface-container-lowest rounded-xl shadow-ambient relative group flex flex-col h-full overflow-hidden transition-shadow hover:shadow-lg";

  // Sin `absolute`: vive en la pila de chips de arriba a la izquierda, junto a
  // NUEVO y %OFF. `tertiary-container` y no `secondary` (mockup `.chip--dest`):
  // en la paleta pública `secondary` es el naranja del %OFF, y los dos chips
  // apilados del mismo color no se distinguirían.
  const destacadoChip = producto.destacado ? (
    <span className="font-label-sm text-label-sm flex items-center gap-1 rounded-full bg-tertiary-container px-2 py-1 uppercase tracking-wide text-on-tertiary-container">
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">star</span>
      Destacado
    </span>
  ) : null;

  // `esNuevo` lo resuelve el backend (fecha de alta): la card no mira fechas.
  const nuevoChip = producto.esNuevo ? (
    <span className="font-label-sm text-label-sm rounded-full bg-primary px-2 py-1 uppercase tracking-wide text-on-primary">
      Nuevo
    </span>
  ) : null;

  const offChip = producto.descuento?.porcentaje ? (
    <span className="font-label-sm text-label-sm rounded-full bg-secondary px-2 py-1 uppercase tracking-wide text-on-secondary">
      {producto.descuento.porcentaje}% OFF
    </span>
  ) : null;

  const etiquetaChip = producto.etiqueta ? (
    <span
      style={
        producto.etiqueta.colorFondo
          ? {
              backgroundColor: `rgb(${producto.etiqueta.colorFondo})`,
              color: `rgb(${producto.etiqueta.colorTexto})`,
            }
          : undefined
      }
      className={`font-label-sm text-label-sm absolute bottom-2 left-2 z-10 rounded-full px-2 py-1 uppercase tracking-wide ${
        producto.etiqueta.colorFondo ? "" : "bg-secondary-container text-on-secondary-container"
      }`}
    >
      {producto.etiqueta.nombre}
    </span>
  ) : null;

  // Predicado literal `> 0 && <= 3`, sin constante: es una de las copias del
  // umbral de stock bajo que lista `docs/reglas/sincronizaciones.md`.
  const pocoStockChip =
    producto.stock > 0 && producto.stock <= 3 ? (
      <span className="font-label-sm text-label-sm absolute bottom-2 right-2 z-10 rounded-full bg-surface-container-lowest px-2 py-1 uppercase tracking-wide text-secondary shadow-ambient">
        Últimos {producto.stock}
      </span>
    ) : null;

  // Lugares reservados: sin dato, sin nodo. El backend todavía no emite
  // `calificacion` ni `cuotas` — no hay placeholder ni "próximamente".
  const calificacionSlot = producto.calificacion ? (
    <div className="flex items-center gap-1 font-label-md text-label-md text-on-surface">
      <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-tertiary">star</span>
      {String(producto.calificacion.promedio).replace(".", ",")}
      <span className="font-body-sm text-body-sm text-outline">({producto.calificacion.cantidad})</span>
    </div>
  ) : null;

  const cuotasSlot = producto.cuotas ? (
    <p className="font-body-sm text-body-sm text-primary-container">{producto.cuotas}</p>
  ) : null;

  const textoCategoria = producto.categoria?.nombre ? (
    <span className="font-label-sm text-label-sm mb-1 block truncate uppercase tracking-wide text-on-surface-variant">
      {producto.categoria.nombre}
    </span>
  ) : null;

  return (
    // ⚠️ EL CORAZÓN ES HERMANO DEL ENLACE, NO SU HIJO. Un `<button>` dentro de
    // un `<a>` es HTML inválido, y el daño es medible: el nombre accesible del
    // enlace arrancaba con "Agregar a favoritos" y después repetía el producto
    // dos veces ("… Best Seller Tecnología Soporte Celular… $ 14.250"). Son 12
    // enlaces así en `/coleccion`, 8 en la home y 4 en los relacionados.
    //
    // La card entera SIGUE siendo un enlace: el `<a>` cubre todo el contenido y
    // el corazón se le superpone (`absolute` + `z-20`), que es exactamente lo
    // que se veía antes. Sus `preventDefault`/`stopPropagation` ya no hacen
    // falta para no navegar —no está adentro del enlace— pero se conservan:
    // `BotonFavorito` también vive sobre superficies clickeables en la ficha.
    <div className={shell}>
      {/* ⚠️ El posicionamiento va en este `<span>`, NO en el `className` del
          botón. `BotonFavorito` necesita ser `relative` para anclar el
          pseudo-elemento que le da los 44×44 de área táctil, y pasarle
          `absolute` desde acá NO lo pisa: en el CSS de Tailwind la regla
          `.relative` se emite DESPUÉS de `.absolute`, así que gana `relative`
          sin importar el orden en el atributo. Medido: el corazón dejaba de
          estar posicionado, caía al flujo de la tarjeta y se estiraba a 270px
          de ancho empujando la foto. */}
      <span className="absolute right-2 top-2 z-20">
        <BotonFavorito
          productoId={producto.id}
          className="rounded-full bg-surface-container-lowest/90 shadow-sm"
        />
      </span>
      {/* `draggable={false}` acá y en la `<img>` de abajo:
          `CarruselDestacados.jsx` reutiliza esta card y mueve la pista con
          eventos de puntero sobre el mismo envoltorio. Sin esto el navegador
          arranca su propio drag nativo de enlace/imagen apenas el gesto empieza
          sobre la foto —la superficie más grande de la tarjeta— y el arrastre
          por puntero que gira el carrusel se corta a la mitad. */}
      <Link to={href} className="flex flex-1 flex-col" draggable={false}>
        <div className="relative aspect-square w-full bg-surface-container-lowest">
          {foto ? (
          // `absolute inset-0`, NO `h-full w-full` en flujo normal: un <img> con
          // alto en porcentaje no resuelve si el contenedor solo tiene su alto
          // definido por `aspect-ratio` (gotcha real de CSS con elementos
          // reemplazados) — el navegador cae al `height: auto` y el <img>
          // termina de su propio alto intrínseco, estirando la caja entera al
          // aspect ratio real de CADA foto. Eso era lo que hacía que las cards
          // salieran de tamaños distintos según la imagen, con cover o con
          // contain daba lo mismo. Sacándolo del flujo (como ya están el
          // corazón y los chips acá al lado) la caja queda cuadrada siempre.
            <img
              className="absolute inset-0 h-full w-full object-contain"
              src={foto.url}
              alt={producto.nombre}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : null}
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
            {destacadoChip}
            {nuevoChip}
            {offChip}
          </div>
          {etiquetaChip}
          {pocoStockChip}
        </div>
        <div className="flex flex-1 flex-col p-2.5 md:p-3">
          {textoCategoria}
          {/* DOS líneas, no `truncate`. En la grilla de 4 columnas, "Reloj
              Despertador Digital Crist…" y "Reloj Despertador Digital Núm…"
              eran indistinguibles sin abrir cada uno: el nombre se cortaba
              justo donde empezaba a distinguirlos.
              `min-h-[2lh]` reserva las dos líneas SIEMPRE. Sin eso, en una fila
              con un nombre de una línea y otro de dos, la eyebrow de categoría
              y el nombre quedan a distinta altura entre tarjetas vecinas — el
              precio no se mueve porque su bloque va con `mt-auto`, pero el bloque de
              texto se desalinea. Reservar el alto lo mantiene parejo. */}
          <h3 className="font-body-md text-[13px] md:text-body-md mb-1 line-clamp-2 min-h-[2lh] text-on-surface">
            {producto.nombre}
          </h3>
          {/* Puntaje, precio y cuotas en UN bloque con `mt-auto`: si el
              `mt-auto` fuera del precio, un puntaje con dato quedaría arriba y
              el precio abajo, separados por el hueco que abre la card más alta
              de la fila. */}
          <div className="mt-auto flex flex-col gap-0.5">
            {calificacionSlot}
            {/* El precio y su promoción, si la tiene. `PrecioProducto` no
                calcula nada: el efectivo llega resuelto del backend. Mockup
                `.precio__actual`: Outfit (`font-label-lg` en el público) 800,
                terracota, 19px / 24px. Solo se ajusta desde la card: los
                defaults de `PrecioProducto` los usa la ficha. */}
            <PrecioProducto
              producto={producto}
              className="font-label-lg text-[19px] leading-[22px] md:text-[24px] md:leading-[28px] font-extrabold tracking-[-0.03em] tabular-nums text-secondary"
            />
            {cuotasSlot}
          </div>
        </div>
      </Link>
      {/* Mismo criterio que el corazón: HERMANO del enlace, no hijo. En flujo
          normal al pie de la card, no `absolute`. Dentro de
          `CarruselDestacados`, el `onClickCapture` del envoltorio corre en fase
          de captura antes que el `onClick` de este botón, así que un arrastre
          lo cancela igual que cancela la navegación. */}
      <div className="p-2.5 pt-0 md:p-3 md:pt-0">
        <BotonAgregar producto={producto} className="w-full" />
      </div>
    </div>
  );
}

export default ProductCard;
