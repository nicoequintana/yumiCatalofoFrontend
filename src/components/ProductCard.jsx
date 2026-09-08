import { Link } from "react-router-dom";
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

  const shell = `bg-surface-container-lowest rounded-xl shadow-ambient relative group flex flex-col h-full overflow-hidden transition-shadow hover:shadow-lg ${
    producto.destacado ? "ring-2 ring-secondary shadow-[0_0_24px_-8px_rgba(119,89,47,0.5)]" : ""
  }`;

  const destacadoChip = producto.destacado ? (
    <span className="font-label-sm text-label-sm absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-secondary px-2 py-1 uppercase tracking-wide text-on-primary">
      <span className="material-symbols-outlined text-[14px]">star</span>
      Destacado
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
      className={`font-label-sm text-label-sm absolute bottom-2 left-2 z-10 rounded px-2 py-1 uppercase tracking-wide ${
        producto.etiqueta.colorFondo ? "" : "bg-secondary-container text-on-secondary-container"
      }`}
    >
      {producto.etiqueta.nombre}
    </span>
  ) : null;

  const pocoStockChip =
    producto.stock > 0 && producto.stock <= 3 ? (
      <span className="font-label-sm text-label-sm absolute bottom-2 right-2 z-10 rounded bg-error px-2 py-1 uppercase tracking-wide text-on-primary">
        Últimos {producto.stock}
      </span>
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
          {destacadoChip}
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
              precio no se mueve porque va con `mt-auto`, pero el bloque de
              texto se desalinea. Reservar el alto lo mantiene parejo. */}
          <h3 className="font-body-md text-[13px] md:text-body-md mb-1 line-clamp-2 min-h-[2lh] text-on-surface">
            {producto.nombre}
          </h3>
          {/* El precio y su promoción, si la tiene. `PrecioProducto` no calcula
              nada: el efectivo llega resuelto del backend. */}
          <PrecioProducto
            producto={producto}
            className="font-body-lg text-[15px] md:text-[17px] font-bold mt-auto text-primary"
          />
        </div>
      </Link>
    </div>
  );
}

export default ProductCard;
